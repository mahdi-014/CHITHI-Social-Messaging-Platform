import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { UploadIntentDto } from './dto/upload-intent.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Post('upload-intents')
  @HttpCode(HttpStatus.CREATED)
  async createIntent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UploadIntentDto,
  ) {
    return this.mediaService.createUploadIntent(user.userId, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeUpload(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) mediaAssetId: string,
  ) {
    return this.mediaService.completeUpload(user.userId, mediaAssetId);
  }

  @Get(':id/access')
  async getAccess(@Param('id', ParseUUIDPipe) mediaAssetId: string) {
    return this.mediaService.getMediaAccess(mediaAssetId);
  }

  @Public()
  @Post(':id/upload')
  async handleFileUpload(
    @Param('id', ParseUUIDPipe) mediaAssetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.mediaService.saveUploadedFile(
        mediaAssetId,
        req,
        req.headers['content-type'],
      );
      res.status(HttpStatus.OK).json({ success: true, mediaAssetId, size: result.size });
    } catch (err: any) {
      const status = err.status || HttpStatus.BAD_REQUEST;
      res.status(status).json({ error: err.message || 'Failed to save media upload' });
    }
  }

  @Public()
  @Get(':id/file')
  async streamFile(
    @Param('id', ParseUUIDPipe) mediaAssetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userPayload = (req as any).user as CurrentUserPayload | undefined;
    let userId = userPayload?.userId || null;

    if (!userId) {
      const rawToken =
        (req.query?.['token'] as string) ||
        req.cookies?.['accessToken'] ||
        req.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (rawToken) {
        try {
          const secret =
            this.configService.get<string>('jwt.accessSecret') ||
            'chithi_super_secret_jwt_access_key_2026_dev';
          const payload = this.jwtService.verify(rawToken, { secret });
          userId = payload.sub || payload.userId;
        } catch {
          // Token invalid or expired
        }
      }
    }

    const allowed = await this.mediaService.checkMediaAccess(userId, mediaAssetId);
    if (!allowed) {
      throw new ForbiddenException({
        code: 'MEDIA_ACCESS_FORBIDDEN',
        message: 'You are not authorized to view or download this media file',
      });
    }

    const initial = await this.mediaService.getMediaStream(mediaAssetId);
    const fileSize = initial.fileSize;

    // Handle HTTP Range requests for video seeking and smooth audio/video streaming
    const rangeHeader = req.headers.range;
    if (rangeHeader && fileSize > 0) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

        if (start < fileSize && end < fileSize && start <= end) {
          const chunkSize = end - start + 1;
          const { stream, mimeType } = await this.mediaService.getMediaStream(mediaAssetId, {
            start,
            end,
          });

          res.status(HttpStatus.PARTIAL_CONTENT);
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          res.setHeader('Content-Length', chunkSize.toString());
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'private, max-age=86400');
          res.setHeader('X-Content-Type-Options', 'nosniff');

          stream.pipe(res);
          return;
        }
      }
    }

    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', initial.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (fileSize) {
      res.setHeader('Content-Length', fileSize.toString());
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    initial.stream.pipe(res);
  }
}
