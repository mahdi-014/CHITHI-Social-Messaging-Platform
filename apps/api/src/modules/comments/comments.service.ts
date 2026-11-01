import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FriendshipsService } from '../friendships/friendships.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friendshipsService: FriendshipsService,
  ) {}

  async createComment(authorId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== authorId) {
      const areFriends = await this.friendshipsService.areFriends(authorId, post.authorId);
      if (!areFriends) {
        throw new ForbiddenException('You can only comment on posts by accepted friends');
      }
    }

    if (dto.parentCommentId) {
      const parent = await this.prisma.postComment.findUnique({
        where: { id: dto.parentCommentId },
      });
      if (!parent || parent.postId !== postId || parent.deletedAt) {
        throw new BadRequestException('Parent comment does not exist on this post');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.postComment.create({
        data: {
          postId,
          authorId,
          body: dto.body.trim(),
          parentCommentId: dto.parentCommentId,
        },
        include: {
          author: {
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

      // Send notification to post author if not author
      if (post.authorId !== authorId) {
        await tx.notification.create({
          data: {
            userId: post.authorId,
            actorId: authorId,
            notificationType: 'post_comment',
            entityType: 'post',
            entityId: postId,
            data: {
              commentId: comment.id,
              preview: comment.body.slice(0, 50),
            },
          },
        });
      }

      return comment;
    });
  }

  async getComments(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      const areFriends = await this.friendshipsService.areFriends(userId, post.authorId);
      if (!areFriends) {
        throw new ForbiddenException('You can only view comments on posts by accepted friends');
      }
    }

    return this.prisma.postComment.findMany({
      where: {
        postId,
        deletedAt: null,
      },
      include: {
        author: {
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
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.postComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }
}
