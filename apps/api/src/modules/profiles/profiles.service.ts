import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(dto.displayName ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio?.trim() || null } : {}),
        ...(dto.avatarMediaId !== undefined ? { avatarMediaId: dto.avatarMediaId } : {}),
        ...(dto.coverMediaId !== undefined ? { coverMediaId: dto.coverMediaId } : {}),
      },
      create: {
        userId,
        displayName: dto.displayName?.trim() || 'User',
        bio: dto.bio?.trim() || null,
        avatarMediaId: dto.avatarMediaId,
        coverMediaId: dto.coverMediaId,
      },
    });

    return profile;
  }

  async getProfile(viewerId: string, targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
      },
    });

    if (!targetUser || targetUser.accountStatus !== 'active') {
      throw new NotFoundException('User profile not found');
    }

    const isSelf = viewerId === targetUserId;

    // Check friendship
    let isFriend = false;
    if (!isSelf) {
      const lowId = viewerId < targetUserId ? viewerId : targetUserId;
      const highId = viewerId < targetUserId ? targetUserId : viewerId;
      const friendship = await this.prisma.friendship.findUnique({
        where: { userLowId_userHighId: { userLowId: lowId, userHighId: highId } },
      });
      isFriend = !!friendship;
    }

    // Count friends
    const friendCount = await this.prisma.friendship.count({
      where: {
        OR: [{ userLowId: targetUserId }, { userHighId: targetUserId }],
      },
    });

    // Count posts
    const postCount = await this.prisma.post.count({
      where: { authorId: targetUserId, deletedAt: null },
    });

    return {
      userId: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.profile?.displayName || targetUser.username,
      bio: isSelf || isFriend ? targetUser.profile?.bio : null,
      avatarMediaId: targetUser.profile?.avatarMediaId,
      coverMediaId: isSelf || isFriend ? targetUser.profile?.coverMediaId : null,
      friendCount,
      postCount: isSelf || isFriend ? postCount : null,
      isSelf,
      isFriend,
      createdAt: targetUser.createdAt,
    };
  }
}
