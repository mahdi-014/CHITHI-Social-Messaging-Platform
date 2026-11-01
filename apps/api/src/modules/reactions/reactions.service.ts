import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FriendshipsService } from '../friendships/friendships.service';

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friendshipsService: FriendshipsService,
  ) {}

  async togglePostReaction(userId: string, postId: string, reactionType: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      const areFriends = await this.friendshipsService.areFriends(userId, post.authorId);
      if (!areFriends) {
        throw new ForbiddenException('You can only react to posts by accepted friends');
      }
    }

    const existing = await this.prisma.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existing) {
      if (existing.reactionType === reactionType) {
        await this.prisma.postReaction.delete({
          where: { id: existing.id },
        });
        return { reactionType: null, action: 'removed' };
      }

      const updated = await this.prisma.postReaction.update({
        where: { id: existing.id },
        data: { reactionType },
      });
      return { reactionType: updated.reactionType, action: 'updated' };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const reaction = await tx.postReaction.create({
        data: {
          postId,
          userId,
          reactionType,
        },
      });

      if (post.authorId !== userId) {
        await tx.notification.create({
          data: {
            userId: post.authorId,
            actorId: userId,
            notificationType: 'post_reaction',
            entityType: 'post',
            entityId: postId,
            data: { reactionType },
          },
        });
      }

      return reaction;
    });

    return { reactionType: created.reactionType, action: 'added' };
  }
}
