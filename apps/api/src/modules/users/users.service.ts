import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      profile: user.profile,
      settings: user.settings,
      createdAt: user.createdAt,
    };
  }

  async searchExactUsername(currentUserId: string, usernameQuery: string) {
    const trimmed = usernameQuery.trim().toLowerCase();
    if (!trimmed) {
      return null;
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        username: { equals: trimmed, mode: 'insensitive' },
        accountStatus: 'active',
      },
      include: {
        profile: true,
      },
    });

    if (!targetUser) {
      return null;
    }

    // Determine relationship status with current user
    let friendshipStatus: 'self' | 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked' = 'none';

    if (targetUser.id === currentUserId) {
      friendshipStatus = 'self';
    } else {
      // Check blocks
      const blockExists = await this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockedId: targetUser.id },
            { blockerId: targetUser.id, blockedId: currentUserId },
          ],
        },
      });

      if (blockExists) {
        friendshipStatus = 'blocked';
      } else {
        // Check canonical friendship
        const lowId = currentUserId < targetUser.id ? currentUserId : targetUser.id;
        const highId = currentUserId < targetUser.id ? targetUser.id : currentUserId;

        const friendship = await this.prisma.friendship.findUnique({
          where: {
            userLowId_userHighId: { userLowId: lowId, userHighId: highId },
          },
        });

        if (friendship) {
          friendshipStatus = 'friends';
        } else {
          // Check pending friend requests
          const pendingRequest = await this.prisma.friendRequest.findFirst({
            where: {
              status: 'pending',
              OR: [
                { senderId: currentUserId, receiverId: targetUser.id },
                { senderId: targetUser.id, receiverId: currentUserId },
              ],
            },
          });

          if (pendingRequest) {
            friendshipStatus = pendingRequest.senderId === currentUserId ? 'pending_sent' : 'pending_received';
          }
        }
      }
    }

    return {
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.profile?.displayName || targetUser.username,
      bio: friendshipStatus === 'friends' ? targetUser.profile?.bio : undefined,
      avatarMediaId: targetUser.profile?.avatarMediaId,
      friendshipStatus,
    };
  }

  async getUserPreview(currentUserId: string, targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!targetUser || targetUser.accountStatus !== 'active') {
      throw new NotFoundException('User not found');
    }

    return this.searchExactUsername(currentUserId, targetUser.username);
  }

  async getSettings(userId: string) {
    const settings = await this.prisma.userSetting.findUnique({
      where: { userId },
    });
    return settings;
  }

  async updateSettings(userId: string, data: any) {
    return this.prisma.userSetting.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }
}
