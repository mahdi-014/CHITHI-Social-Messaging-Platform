import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { FriendshipsService } from '../friendships/friendships.service';
import { UploadIntentDto, MediaCategoryEnum } from './dto/upload-intent.dto';
import { StorageProvider } from './storage/storage.interface';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
import { validateMediaMagicBytes } from './utils/magic-bytes';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly storage: StorageProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly friendshipsService: FriendshipsService,
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly s3StorageProvider: S3StorageProvider,
  ) {
    const provider = this.configService.get<string>('storage.provider') || 'local';
    this.storage = provider === 's3' ? this.s3StorageProvider : this.localStorageProvider;
  }

  async createUploadIntent(userId: string, dto: UploadIntentDto) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(dto.mimeType)) {
      throw new BadRequestException({
        code: 'INVALID_MIME_TYPE',
        message: `MIME type ${dto.mimeType} is not supported`,
      });
    }

    // Category limits
    if (dto.category === MediaCategoryEnum.AVATAR && dto.fileSize > 5 * 1024 * 1024) {
      throw new BadRequestException('Avatar must be under 5 MB');
    }

    if (dto.category === MediaCategoryEnum.POST_VIDEO && dto.fileSize > 100 * 1024 * 1024) {
      throw new BadRequestException('Video must be under 100 MB');
    }

    if (dto.fileSize > 100 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds platform limit of 100 MB');
    }

    // Strict file extension sanitization
    const rawExt = path.extname(dto.fileName).toLowerCase();
    const safeExt = /^\.[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : '.bin';
    const storageKey = `${userId}/${randomUUID()}${safeExt}`;

    const mediaAsset = await this.prisma.mediaAsset.create({
      data: {
        ownerId: userId,
        storageProvider: this.configService.get<string>('storage.provider') || 'local',
        storageKey,
        mimeType: dto.mimeType,
        fileSize: BigInt(dto.fileSize),
        processingStatus: 'pending',
      },
    });

    const uploadUrl = `/api/v1/media/${mediaAsset.id}/upload`;

    return {
      mediaAssetId: mediaAsset.id,
      storageKey,
      uploadUrl,
      expiresIn: 900,
    };
  }

  async saveUploadedFile(
    mediaAssetId: string,
    stream: NodeJS.ReadableStream,
    uploadedMimeType?: string,
  ) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });

    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }

    // Capture initial buffer chunk for magic bytes validation
    const chunks: Buffer[] = [];
    let initialChunkCaptured = false;
    let initialChunk: Buffer | null = null;

    const streamTracker = new Promise<{ key: string; size: number }>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        if (!initialChunkCaptured) {
          initialChunk = chunk;
          initialChunkCaptured = true;
          // Validate magic bytes
          const isValid = validateMediaMagicBytes(chunk, asset.mimeType);
          if (!isValid) {
            if (typeof (stream as any).resume === 'function') {
              (stream as any).resume();
            }
            reject(new BadRequestException(`File magic bytes do not match declared MIME type ${asset.mimeType}`));
            return;
          }
        }
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        try {
          const fullBuffer = Buffer.concat(chunks);
          const result = await this.storage.putObject(asset.storageKey, fullBuffer, asset.mimeType);

          // Update asset status
          await this.prisma.mediaAsset.update({
            where: { id: mediaAssetId },
            data: {
              fileSize: BigInt(result.size),
              processingStatus: 'ready',
              readyAt: new Date(),
            },
          });

          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });

    return streamTracker;
  }

  async completeUpload(userId: string, mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });

    if (!asset || asset.ownerId !== userId) {
      throw new NotFoundException('Media asset not found or unauthorized');
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        processingStatus: 'ready',
        readyAt: new Date(),
      },
    });

    return {
      ...updated,
      fileSize: Number(updated.fileSize),
    };
  }

  async getMediaAccess(mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });

    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }

    return {
      id: asset.id,
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
      processingStatus: asset.processingStatus,
      url: `/api/v1/media/${asset.id}/file`,
    };
  }

  async checkMediaAccess(userId: string | null, mediaAssetId: string): Promise<boolean> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      include: {
        avatarForProfiles: true,
        coverForProfiles: true,
        avatarForConversations: true,
        postMedia: {
          include: {
            post: true,
          },
        },
        messageAttachments: {
          include: {
            message: {
              include: {
                conversation: {
                  include: {
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return false;
    }

    // 1. Avatars and Covers are public
    if (
      asset.avatarForProfiles.length > 0 ||
      asset.coverForProfiles.length > 0 ||
      asset.avatarForConversations.length > 0
    ) {
      return true;
    }

    // Non-public media requires authenticated user
    if (!userId) {
      return false;
    }

    // 2. Owner always has access
    if (asset.ownerId === userId) {
      return true;
    }

    // 3. Post media: accessible if user is friend of post author or author themself
    for (const pm of asset.postMedia) {
      if (pm.post.authorId === userId) return true;
      const areFriends = await this.friendshipsService.areFriends(userId, pm.post.authorId);
      if (areFriends) return true;
    }

    // 4. Message attachments: accessible if user is a member of the conversation
    for (const ma of asset.messageAttachments) {
      const isMember = ma.message.conversation.members.some(
        (m) => m.userId === userId && !m.leftAt,
      );
      if (isMember) return true;
    }

    // If media is newly created (pending attachment), allow access only to owner
    return false;
  }

  async getMediaStream(mediaAssetId: string, range?: { start: number; end: number }) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });

    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }

    const obj = await this.storage.getObject(asset.storageKey, range);
    return {
      stream: obj.stream,
      mimeType: asset.mimeType,
      fileSize: Number(asset.fileSize),
      contentLength: obj.contentLength,
    };
  }

  getFilePath(storageKey: string): string {
    return path.join(process.cwd(), 'uploads', storageKey);
  }
}
