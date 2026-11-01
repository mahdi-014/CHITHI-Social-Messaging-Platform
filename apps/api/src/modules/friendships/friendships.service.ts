import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Injectable()
export class FriendshipsService {
  private readonly logger = new Logger(FriendshipsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getCanonicalPair(userA: string, userB: string) {
    return {
      userLowId: userA < userB ? userA : userB,
      userHighId: userA < userB ? userB : userA,
    };
  }

  async sendFriendRequest(senderId: string, dto: SendFriendRequestDto) {
    const receiverId = dto.receiverId;

    if (senderId === receiverId) {
      throw new BadRequestException({
        code: 'SELF_FRIEND_REQUEST',
        message: 'You cannot send a friend request to yourself',
      });
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      include: { settings: true },
    });

    if (!receiver || receiver.accountStatus !== 'active') {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Target user does not exist or is inactive',
      });
    }

    if (receiver.settings && !receiver.settings.allowFriendRequests) {
      throw new ForbiddenException({
        code: 'REQUESTS_DISABLED',
        message: 'This user is not accepting friend requests',
      });
    }

    // Bidirectional block check
    const isBlocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId },
        ],
      },
    });

    if (isBlocked) {
      throw new ForbiddenException({
        code: 'BLOCKED',
        message: 'Unable to send friend request to this user',
      });
    }

    // Existing friendship check
    const { userLowId, userHighId } = this.getCanonicalPair(senderId, receiverId);
    const existingFriendship = await this.prisma.friendship.findUnique({
      where: { userLowId_userHighId: { userLowId, userHighId } },
    });

    if (existingFriendship) {
      throw new ConflictException({
        code: 'ALREADY_FRIENDS',
        message: 'You are already friends with this user',
      });
    }

    // Pending friend request check in both directions
    const existingPending = await this.prisma.friendRequest.findFirst({
      where: {
        status: 'pending',
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existingPending) {
      if (existingPending.senderId === senderId) {
        throw new ConflictException({
          code: 'REQUEST_ALREADY_PENDING',
          message: 'You already sent a friend request to this user',
        });
      } else {
        throw new ConflictException({
          code: 'REVERSE_REQUEST_PENDING',
          message: 'This user has already sent you a friend request. You can accept it instead.',
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.friendRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'pending',
        },
      });

      // Create notification for receiver
      await tx.notification.create({
        data: {
          userId: receiverId,
          actorId: senderId,
          notificationType: 'friend_request_received',
          entityType: 'friend_request',
          entityId: request.id,
          data: {
            message: dto.message || undefined,
          },
        },
      });

      return request;
    });
  }

  async getIncomingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOutgoingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'pending',
      },
      include: {
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenException('You cannot accept a friend request that was not sent to you');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Friend request is already ${request.status}`);
    }

    const { userLowId, userHighId } = this.getCanonicalPair(request.senderId, request.receiverId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update friend request status
      const updatedRequest = await tx.friendRequest.update({
        where: { id: requestId },
        data: {
          status: 'accepted',
          respondedAt: new Date(),
        },
      });

      // 2. Insert canonical friendship row
      const friendship = await tx.friendship.upsert({
        where: { userLowId_userHighId: { userLowId, userHighId } },
        update: {},
        create: {
          userLowId,
          userHighId,
        },
      });

      // 3. Create notification for original sender
      await tx.notification.create({
        data: {
          userId: request.senderId,
          actorId: userId,
          notificationType: 'friend_request_accepted',
          entityType: 'friendship',
          entityId: updatedRequest.id,
        },
      });

      return { request: updatedRequest, friendship };
    });
  }

  async rejectFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenException('You cannot reject this friend request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Friend request is already ${request.status}`);
    }

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        respondedAt: new Date(),
      },
    });
  }

  async cancelOutgoingRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.senderId !== userId) {
      throw new ForbiddenException('You cannot cancel this friend request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Friend request is already ${request.status}`);
    }

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
        respondedAt: new Date(),
      },
    });
  }

  async getFriendsList(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      include: {
        userLow: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarMediaId: true,
                bio: true,
              },
            },
          },
        },
        userHigh: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarMediaId: true,
                bio: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendships.map((f) => {
      const friend = f.userLowId === userId ? f.userHigh : f.userLow;
      return {
        friendshipId: `${f.userLowId}_${f.userHighId}`,
        friendId: friend.id,
        username: friend.username,
        displayName: friend.profile?.displayName || friend.username,
        avatarMediaId: friend.profile?.avatarMediaId,
        bio: friend.profile?.bio,
        becameFriendsAt: f.createdAt,
      };
    });
  }

  async unfriend(userId: string, targetUserId: string) {
    const { userLowId, userHighId } = this.getCanonicalPair(userId, targetUserId);

    const friendship = await this.prisma.friendship.findUnique({
      where: { userLowId_userHighId: { userLowId, userHighId } },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { userLowId_userHighId: { userLowId, userHighId } },
    });

    return { success: true, message: 'Unfriended successfully' };
  }

  async blockUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const { userLowId, userHighId } = this.getCanonicalPair(userId, targetUserId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Add block
      const block = await tx.block.upsert({
        where: {
          blockerId_blockedId: { blockerId: userId, blockedId: targetUserId },
        },
        update: {},
        create: {
          blockerId: userId,
          blockedId: targetUserId,
        },
      });

      // 2. Remove friendship if exists
      await tx.friendship.deleteMany({
        where: { userLowId, userHighId },
      });

      // 3. Cancel any pending friend requests
      await tx.friendRequest.updateMany({
        where: {
          status: 'pending',
          OR: [
            { senderId: userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: userId },
          ],
        },
        data: {
          status: 'cancelled',
          respondedAt: new Date(),
        },
      });

      return block;
    });
  }

  async unblockUser(userId: string, targetUserId: string) {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetUserId },
      },
    });

    if (!block) {
      throw new NotFoundException('Block record not found');
    }

    await this.prisma.block.delete({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetUserId },
      },
    });

    return { success: true, message: 'User unblocked successfully' };
  }

  async getBlockedUsers(userId: string) {
    return this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
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
  }

  async areFriends(userA: string, userB: string): Promise<boolean> {
    const { userLowId, userHighId } = this.getCanonicalPair(userA, userB);
    const count = await this.prisma.friendship.count({
      where: { userLowId, userHighId },
    });
    return count > 0;
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const count = await this.prisma.block.count({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return count > 0;
  }
}
