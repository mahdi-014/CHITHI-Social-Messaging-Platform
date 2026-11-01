import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { FriendshipsService } from '../friendships/friendships.service';
import { CreateCallDto } from './dto/create-call.dto';
import * as crypto from 'crypto';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);
  // Map of userId -> active callId for O(1) busy detection
  private activeUserCalls = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly friendshipsService: FriendshipsService,
  ) {}

  /**
   * Generates secure RFC 5766 short-lived Coturn / TURN / STUN credentials
   * username = <expiry-timestamp>:<userId>
   * credential = HMAC-SHA1(username, turnSecret) in base64
   */
  getIceServers(userId: string): IceServerConfig[] {
    const turnSecret =
      this.configService.get<string>('webrtc.turnSecret') ||
      'chithi_turn_secret_key_2026_dev';
    const stunUrls = this.configService.get<string[]>('webrtc.stunUrls') || [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ];
    const turnUrls = this.configService.get<string[]>('webrtc.turnUrls') || [
      'turn:localhost:3478?transport=udp',
      'turn:localhost:3478?transport=tcp',
    ];
    const ttl =
      this.configService.get<number>('webrtc.turnTtlSeconds') || 86400;

    const expiry = Math.floor(Date.now() / 1000) + ttl;
    const username = `${expiry}:${userId}`;
    const hmac = crypto.createHmac('sha1', turnSecret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    return [
      {
        urls: stunUrls,
      },
      {
        urls: turnUrls,
        username,
        credential,
      },
    ];
  }

  isUserInActiveCall(userId: string): boolean {
    return this.activeUserCalls.has(userId);
  }

  getActiveCallId(userId: string): string | undefined {
    return this.activeUserCalls.get(userId);
  }

  private registerActiveCall(callId: string, callerId: string, receiverId: string) {
    this.activeUserCalls.set(callerId, callId);
    this.activeUserCalls.set(receiverId, callId);
  }

  private clearActiveCall(callId: string, callerId?: string, receiverId?: string) {
    if (callerId && this.activeUserCalls.get(callerId) === callId) {
      this.activeUserCalls.delete(callerId);
    }
    if (receiverId && this.activeUserCalls.get(receiverId) === callId) {
      this.activeUserCalls.delete(receiverId);
    }
    // Also sweep any remnants
    for (const [userId, cId] of this.activeUserCalls.entries()) {
      if (cId === callId) {
        this.activeUserCalls.delete(userId);
      }
    }
  }

  async initiateCall(callerId: string, dto: CreateCallDto) {
    const { conversationId, callType } = dto;

    // 1. Verify conversation exists and caller is member
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                accountStatus: true,
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
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    if (conversation.type !== 'direct') {
      throw new BadRequestException({
        code: 'GROUP_CALLS_NOT_SUPPORTED',
        message: 'Calling is currently supported for direct 1-on-1 conversations only',
      });
    }

    const callerMember = conversation.members.find((m) => m.userId === callerId && !m.leftAt);
    if (!callerMember) {
      throw new ForbiddenException({
        code: 'NOT_CONVERSATION_MEMBER',
        message: 'You are not a member of this conversation',
      });
    }

    const receiverMember = conversation.members.find((m) => m.userId !== callerId && !m.leftAt);
    if (!receiverMember) {
      throw new BadRequestException({
        code: 'NO_RECIPIENT',
        message: 'Recipient not found in this conversation',
      });
    }

    const receiverId = receiverMember.userId;
    const receiverUser = receiverMember.user;

    if (receiverUser.accountStatus !== 'active') {
      throw new BadRequestException({
        code: 'USER_INACTIVE',
        message: 'Recipient account is not active',
      });
    }

    // 2. Block check (security invariant: blocked pairs cannot communicate)
    const isBlocked = await this.friendshipsService.isBlocked(callerId, receiverId);
    if (isBlocked) {
      throw new ForbiddenException({
        code: 'BLOCKED',
        message: 'Cannot place call to this user',
      });
    }

    // 3. Mutual friendship check
    const areFriends = await this.friendshipsService.areFriends(callerId, receiverId);
    if (!areFriends) {
      throw new ForbiddenException({
        code: 'NOT_FRIENDS',
        message: 'Calls can only be placed between mutual friends',
      });
    }

    // 4. Active call checks
    if (this.isUserInActiveCall(callerId)) {
      throw new ConflictException({
        code: 'CALLER_BUSY',
        message: 'You are already in an active call',
      });
    }

    if (this.isUserInActiveCall(receiverId)) {
      // Create session as busy immediately for audit log
      const busyCall = await this.prisma.callSession.create({
        data: {
          conversationId,
          callerId,
          receiverId,
          callType,
          status: 'busy',
          endReason: 'busy',
          endedAt: new Date(),
        },
      });
      throw new ConflictException({
        code: 'USER_BUSY',
        message: 'User is currently on another call',
        callId: busyCall.id,
      });
    }

    // 5. Create new CallSession in 'initiating' status
    const callSession = await this.prisma.callSession.create({
      data: {
        conversationId,
        callerId,
        receiverId,
        callType,
        status: 'initiating',
      },
      include: {
        caller: {
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
        receiver: {
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
    });

    this.registerActiveCall(callSession.id, callerId, receiverId);

    const callerIceServers = this.getIceServers(callerId);
    const receiverIceServers = this.getIceServers(receiverId);

    return {
      call: callSession,
      callerIceServers,
      receiverIceServers,
    };
  }

  async markRinging(callId: string, calleeId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call || call.receiverId !== calleeId) {
      return null;
    }

    if (call.status === 'initiating') {
      return this.prisma.callSession.update({
        where: { id: callId },
        data: {
          status: 'ringing',
          ringingAt: new Date(),
        },
      });
    }

    return call;
  }

  async acceptCall(callId: string, calleeId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call session not found');
    }

    if (call.receiverId !== calleeId) {
      throw new ForbiddenException('You are not authorized to accept this call');
    }

    if (call.status !== 'initiating' && call.status !== 'ringing') {
      throw new BadRequestException(`Cannot accept call with status ${call.status}`);
    }

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarMediaId: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarMediaId: true } },
          },
        },
      },
    });

    return updated;
  }

  async rejectCall(callId: string, calleeId: string, reason?: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call session not found');
    }

    if (call.receiverId !== calleeId) {
      throw new ForbiddenException('You are not authorized to reject this call');
    }

    this.clearActiveCall(callId, call.callerId, call.receiverId);

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'rejected',
        endReason: reason === 'busy' ? 'busy' : 'rejected',
        endedAt: new Date(),
      },
    });

    return updated;
  }

  async cancelCall(callId: string, callerId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call session not found');
    }

    if (call.callerId !== callerId) {
      throw new ForbiddenException('You are not authorized to cancel this call');
    }

    this.clearActiveCall(callId, call.callerId, call.receiverId);

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'cancelled',
        endReason: 'cancelled',
        endedAt: new Date(),
      },
    });

    return updated;
  }

  async timeoutCall(callId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) return null;

    if (call.status === 'initiating' || call.status === 'ringing') {
      this.clearActiveCall(callId, call.callerId, call.receiverId);

      const updated = await this.prisma.callSession.update({
        where: { id: callId },
        data: {
          status: 'missed',
          endReason: 'missed_timeout',
          endedAt: new Date(),
        },
      });

      // Create missed call notification for receiver
      try {
        await this.prisma.notification.create({
          data: {
            userId: call.receiverId,
            actorId: call.callerId,
            notificationType: 'call_missed',
            entityType: 'call',
            entityId: call.id,
            data: {
              callType: call.callType,
              conversationId: call.conversationId,
            },
          },
        });
      } catch (err: any) {
        this.logger.error(`Failed to create missed call notification: ${err.message}`);
      }

      return updated;
    }

    return call;
  }

  async endCall(callId: string, userId: string, reason?: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call session not found');
    }

    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new ForbiddenException('Not authorized for this call');
    }

    this.clearActiveCall(callId, call.callerId, call.receiverId);

    if (call.status === 'ended' || call.status === 'cancelled' || call.status === 'rejected') {
      return call;
    }

    const endedAt = new Date();
    let durationSeconds = 0;
    if (call.acceptedAt) {
      durationSeconds = Math.max(0, Math.round((endedAt.getTime() - call.acceptedAt.getTime()) / 1000));
    }

    const endReason =
      reason === 'connection_failed'
        ? 'connection_failed'
        : userId === call.callerId
        ? 'caller_hung_up'
        : 'callee_hung_up';

    const updated = await this.prisma.callSession.update({
      where: { id: callId },
      data: {
        status: 'ended',
        endReason,
        endedAt,
        durationSeconds,
      },
    });

    return updated;
  }

  async getCallById(userId: string, callId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarMediaId: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarMediaId: true } },
          },
        },
      },
    });

    if (!call) {
      throw new NotFoundException('Call session not found');
    }

    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new ForbiddenException('Not authorized to view this call');
    }

    return call;
  }

  async getCallHistory(userId: string, limit = 20, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 50);

    const calls = await this.prisma.callSession.findMany({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }],
      },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarMediaId: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarMediaId: true } },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (calls.length > take) {
      const nextItem = calls.pop();
      nextCursor = nextItem!.id;
    }

    return {
      calls,
      nextCursor,
    };
  }
}
