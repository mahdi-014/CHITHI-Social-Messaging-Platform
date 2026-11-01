import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FriendshipsService } from '../friendships/friendships.service';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly friendshipsService: FriendshipsService,
  ) {}

  async createPost(authorId: string, dto: CreatePostDto) {
    if (!dto.contentText?.trim() && (!dto.mediaAssetIds || dto.mediaAssetIds.length === 0)) {
      throw new BadRequestException('A post must contain text or at least one media asset');
    }

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId,
          postType: dto.postType,
          contentText: dto.contentText?.trim() || null,
          visibility: 'friends_only',
        },
      });

      if (dto.mediaAssetIds && dto.mediaAssetIds.length > 0) {
        await tx.postMedia.createMany({
          data: dto.mediaAssetIds.map((mediaAssetId, index) => ({
            postId: post.id,
            mediaAssetId,
            sortOrder: index,
          })),
        });
      }

      return tx.post.findUnique({
        where: { id: post.id },
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
          media: {
            include: { mediaAsset: true },
            orderBy: { sortOrder: 'asc' },
          },
          reactions: true,
          _count: {
            select: { comments: true },
          },
        },
      });
    });
  }

  async getFriendsFeed(userId: string, cursor?: string, limit: number = 20) {
    // 1. Get all accepted friends
    const friends = await this.friendshipsService.getFriendsList(userId);
    const friendIds = friends.map((f) => f.friendId);

    // 2. Author IDs = own posts + accepted friends
    const allowedAuthorIds = [userId, ...friendIds];

    // 3. Exclude blocked users
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    const blockedIds = new Set(blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)));
    const eligibleAuthorIds = allowedAuthorIds.filter((id) => !blockedIds.has(id));

    const takeLimit = Math.min(Math.max(limit, 1), 50);

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: eligibleAuthorIds },
        deletedAt: null,
        visibility: 'friends_only',
      },
      take: takeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
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
        media: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            reactionType: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (posts.length > takeLimit) {
      const nextItem = posts.pop();
      nextCursor = nextItem?.id || null;
    }

    const formatted = posts.map((p) => {
      const userReaction = p.reactions.find((r) => r.userId === userId)?.reactionType || null;
      return {
        ...p,
        userReaction,
        commentCount: p._count.comments,
      };
    });

    return {
      posts: formatted,
      nextCursor,
    };
  }

  async getPostById(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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
        media: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        reactions: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    // Verify visibility
    if (post.authorId !== userId) {
      const areFriends = await this.friendshipsService.areFriends(userId, post.authorId);
      if (!areFriends) {
        throw new ForbiddenException({
          code: 'FRIENDS_ONLY_CONTENT',
          message: 'This post is only visible to accepted friends of the author',
        });
      }

      const isBlocked = await this.friendshipsService.isBlocked(userId, post.authorId);
      if (isBlocked) {
        throw new ForbiddenException('You cannot view this content');
      }
    }

    const userReaction = post.reactions.find((r) => r.userId === userId)?.reactionType || null;

    return {
      ...post,
      userReaction,
      commentCount: post._count.comments,
    };
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        contentText: dto.contentText.trim(),
        updatedAt: new Date(),
      },
    });
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
