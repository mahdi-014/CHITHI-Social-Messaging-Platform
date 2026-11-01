import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { UploadIntentDto, MediaCategoryEnum } from './dto/upload-intent.dto';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
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

    if (dto.category === MediaCategoryEnum.AVATAR && dto.fileSize > 5 * 1024 * 1024) {
      throw new BadRequestException('Avatar must be under 5 MB');
    }

    if (dto.category === MediaCategoryEnum.POST_VIDEO && dto.fileSize > 100 * 1024 * 1024) {
      throw new BadRequestException('Video must be under 100 MB');
    }

    const fileExt = path.extname(dto.fileName) || '.bin';
    const storageKey = `${userId}/${randomUUID()}${fileExt}`;

    const mediaAsset = await this.prisma.mediaAsset.create({
      data: {
        ownerId: userId,
        storageProvider: 'local',
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

  async completeUpload(userId: string, mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });

    if (!asset || asset.ownerId !== userId) {
      throw new NotFoundException('Media asset not found or unauthorized');
    }

    return this.prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        processingStatus: 'ready',
        readyAt: new Date(),
      },
    });
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

  getFilePath(storageKey: string): string {
    return path.join(this.uploadDir, storageKey);
  }
}
