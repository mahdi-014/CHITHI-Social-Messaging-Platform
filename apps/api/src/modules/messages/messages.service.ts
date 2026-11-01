import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { FriendshipsService } from '../friendships/friendships.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly friendshipsService: FriendshipsService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async sendMessage(senderId: string, conversationId: string, dto: SendMessageDto) {
    // 1. Check conversation and active membership
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
      include: {
        conversation: {
          include: {
            directPair: true,
            members: {
              where: { leftAt: null },
            },
          },
        },
      },
    });

    if (!member || member.leftAt) {
      throw new ForbiddenException({
        code: 'NOT_CONVERSATION_MEMBER',
        message: 'You are not an active member of this conversation',
      });
    }

    const conversation = member.conversation;

    // 2. If direct conversation, verify friendship & blocks
    if (conversation.type === 'direct' && conversation.directPair) {
      const otherUserId = conversation.directPair.userLowId === senderId
        ? conversation.directPair.userHighId
        : conversation.directPair.userLowId;

      const areFriends = await this.friendshipsService.areFriends(senderId, otherUserId);
      if (!areFriends) {
        throw new ForbiddenException({
          code: 'FRIENDSHIP_REQUIRED',
          message: 'Direct messages can only be sent between accepted friends',
        });
      }

      const isBlocked = await this.friendshipsService.isBlocked(senderId, otherUserId);
      if (isBlocked) {
        throw new ForbiddenException({
          code: 'BLOCKED',
          message: 'Communication is blocked between these users',
        });
      }
    }

    // 3. Idempotency check with clientMessageId
    if (dto.clientMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: {
          senderId_clientMessageId: {
            senderId,
            clientMessageId: dto.clientMessageId,
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarMediaId: true,
                },
              },
            },
          },
          attachments: {
            include: { mediaAsset: true },
          },
          receipts: true,
        },
      });

      if (existing) {
        return existing;
      }
    }

    // 4. Validate body or attachments
    if (!dto.body?.trim() && (!dto.attachmentMediaIds || dto.attachmentMediaIds.length === 0)) {
      throw new BadRequestException('A message must contain text or at least one attachment');
    }

    // 5. Atomic persist message + outbox event
    const message = await this.prisma.$transaction(async (tx) => {
      const newMsg = await tx.message.create({
        data: {
          conversationId,
          senderId,
          clientMessageId: dto.clientMessageId,
          messageType: dto.messageType,
          body: dto.body?.trim() || null,
          replyToMessageId: dto.replyToMessageId,
        },
      });

      if (dto.attachmentMediaIds && dto.attachmentMediaIds.length > 0) {
        await tx.messageAttachment.createMany({
          data: dto.attachmentMediaIds.map((mediaAssetId, index) => ({
            messageId: newMsg.id,
            mediaAssetId,
            sortOrder: index,
          })),
        });
      }

      // Update conversation last message pointers
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: newMsg.id,
          lastMessageAt: newMsg.createdAt,
          updatedAt: newMsg.createdAt,
        },
      });

      // Update sender's last read pointer
      await tx.conversationMember.update({
        where: {
          conversationId_userId: { conversationId, userId: senderId },
        },
        data: {
          lastReadMessageId: newMsg.id,
        },
      });

      // Insert transactional outbox event
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'conversation',
          aggregateId: conversationId,
          eventType: 'message:new',
          payload: {
            messageId: newMsg.id,
            conversationId,
            senderId,
            messageType: newMsg.messageType,
            body: newMsg.body,
            createdAt: newMsg.createdAt,
          },
        },
      });

      return tx.message.findUnique({
        where: { id: newMsg.id },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarMediaId: true,
                },
              },
            },
          },
          attachments: {
            include: { mediaAsset: true },
          },
          receipts: true,
        },
      });
    });

    if (this.realtimeGateway) {
      this.realtimeGateway.broadcastNewMessage(conversationId, senderId, message);
    }

    return message;
  }

  async getMessages(userId: string, conversationId: string, cursor?: string, limit: number = 30) {
    // Verify membership
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member || member.leftAt) {
      throw new ForbiddenException({
        code: 'NOT_CONVERSATION_MEMBER',
        message: 'You are not a member of this conversation',
      });
    }

    const takeLimit = Math.min(Math.max(limit, 1), 100);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      take: takeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarMediaId: true,
              },
            },
          },
        },
        attachments: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        receipts: true,
        reactions: true,
      },
    });

    let nextCursor: string | null = null;
    if (messages.length > takeLimit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id || null;
    }

    // Format soft-deleted messages
    const formatted = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      sender: m.sender,
      messageType: m.messageType,
      body: m.deletedAt ? 'This message was deleted' : m.body,
      isDeleted: !!m.deletedAt,
      isEdited: !!m.editedAt,
      replyToMessageId: m.replyToMessageId,
      attachments: m.deletedAt ? [] : m.attachments,
      receipts: m.receipts,
      reactions: m.reactions,
      createdAt: m.createdAt,
      editedAt: m.editedAt,
    }));

    return {
      messages: formatted,
      nextCursor,
    };
  }

  async updateReceipt(userId: string, messageId: string, status: 'delivered' | 'read') {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Sender doesn't receipt their own message
    if (message.senderId === userId) {
      return null;
    }

    const updateData: any = {};
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'read') {
      updateData.readAt = new Date();
      if (!updateData.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
    }

    const receipt = await this.prisma.messageReceipt.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      update: updateData,
      create: {
        messageId,
        userId,
        ...updateData,
      },
    });

    if (status === 'read') {
      await this.prisma.conversationMember.update({
        where: {
          conversationId_userId: { conversationId: message.conversationId, userId },
        },
        data: {
          lastReadMessageId: messageId,
        },
      });
    }

    return receipt;
  }

  async editMessage(userId: string, messageId: string, newBody: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        body: newBody.trim(),
        editedAt: new Date(),
      },
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async toggleReaction(userId: string, messageId: string, reaction: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId: { messageId, userId },
      },
    });

    if (existing && existing.reaction === reaction) {
      await this.prisma.messageReaction.delete({
        where: { id: existing.id },
      });
      return { reaction: null, action: 'removed' };
    }

    const saved = await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      update: { reaction },
      create: {
        messageId,
        userId,
        reaction,
      },
    });

    return { reaction: saved.reaction, action: 'saved' };
  }
}
