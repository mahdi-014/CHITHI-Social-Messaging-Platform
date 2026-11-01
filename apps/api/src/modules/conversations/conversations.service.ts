import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FriendshipsService } from '../friendships/friendships.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly friendshipsService: FriendshipsService,
  ) {}

  async getOrCreateDirectConversation(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException('Cannot start a direct conversation with yourself');
    }

    // 1. Verify active mutual friendship
    const areFriends = await this.friendshipsService.areFriends(userId, friendId);
    if (!areFriends) {
      throw new ForbiddenException({
        code: 'FRIENDSHIP_REQUIRED',
        message: 'You can only message users after becoming mutual friends',
      });
    }

    // 2. Verify no block in either direction
    const isBlocked = await this.friendshipsService.isBlocked(userId, friendId);
    if (isBlocked) {
      throw new ForbiddenException({
        code: 'BLOCKED',
        message: 'Direct messaging is blocked between these users',
      });
    }

    const userLowId = userId < friendId ? userId : friendId;
    const userHighId = userId < friendId ? friendId : userId;

    // 3. Check existing direct conversation pair
    const existingPair = await this.prisma.directConversationPair.findUnique({
      where: {
        userLowId_userHighId: { userLowId, userHighId },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
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
              },
            },
            lastMessage: true,
          },
        },
      },
    });

    if (existingPair) {
      return this.formatConversation(existingPair.conversation, userId);
    }

    // 4. Create conversation atomically
    const newConversation = await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          type: 'direct',
          createdBy: userId,
        },
      });

      await tx.directConversationPair.create({
        data: {
          conversationId: conv.id,
          userLowId,
          userHighId,
        },
      });

      await tx.conversationMember.createMany({
        data: [
          { conversationId: conv.id, userId, role: 'member' },
          { conversationId: conv.id, userId: friendId, role: 'member' },
        ],
      });

      return tx.conversation.findUnique({
        where: { id: conv.id },
        include: {
          members: {
            include: {
              user: {
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
            },
          },
          lastMessage: true,
        },
      });
    });

    return this.formatConversation(newConversation!, userId);
  }

  async getUserConversations(userId: string) {
    const memberRecords = await this.prisma.conversationMember.findMany({
      where: {
        userId,
        leftAt: null,
      },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
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
              },
            },
            lastMessage: {
              select: {
                id: true,
                senderId: true,
                messageType: true,
                body: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: 'desc',
        },
      },
    });

    const results = await Promise.all(
      memberRecords.map(async (m) => {
        const conv = m.conversation;
        // Count unread messages
        let unreadCount = 0;
        if (m.lastReadMessageId) {
          const lastRead = await this.prisma.message.findUnique({
            where: { id: m.lastReadMessageId },
            select: { createdAt: true },
          });
          if (lastRead) {
            unreadCount = await this.prisma.message.count({
              where: {
                conversationId: conv.id,
                senderId: { not: userId },
                createdAt: { gt: lastRead.createdAt },
              },
            });
          }
        } else {
          unreadCount = await this.prisma.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
            },
          });
        }

        const formatted = this.formatConversation(conv, userId);
        return {
          ...formatted,
          unreadCount,
          lastReadMessageId: m.lastReadMessageId,
        };
      }),
    );

    return results;
  }

  async getConversationById(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member || member.leftAt) {
      throw new ForbiddenException({
        code: 'NOT_CONVERSATION_MEMBER',
        message: 'You are not an active member of this conversation',
      });
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
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
          },
        },
        lastMessage: true,
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    return this.formatConversation(conv, userId);
  }

  private formatConversation(conv: any, currentUserId: string) {
    const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
    const title = conv.type === 'direct'
      ? (otherMember?.user.profile?.displayName || otherMember?.user.username || 'Direct Message')
      : (conv.title || 'Group Chat');

    return {
      id: conv.id,
      type: conv.type,
      title,
      avatarMediaId: conv.avatarMediaId || otherMember?.user.profile?.avatarMediaId,
      otherParticipant: otherMember ? {
        id: otherMember.user.id,
        username: otherMember.user.username,
        displayName: otherMember.user.profile?.displayName || otherMember.user.username,
        avatarMediaId: otherMember.user.profile?.avatarMediaId,
      } : null,
      lastMessage: conv.lastMessage ? {
        id: conv.lastMessage.id,
        senderId: conv.lastMessage.senderId,
        messageType: conv.lastMessage.messageType,
        body: conv.lastMessage.body,
        createdAt: conv.lastMessage.createdAt,
      } : null,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }
}
