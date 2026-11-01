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
import { MediaService } from './media.service';
import { UploadIntentDto } from './dto/upload-intent.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

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
    const userId = userPayload?.userId || null;

    const allowed = await this.mediaService.checkMediaAccess(userId, mediaAssetId);
    if (!allowed) {
      throw new ForbiddenException({
        code: 'MEDIA_ACCESS_FORBIDDEN',
        message: 'You are not authorized to view or download this media file',
      });
    }

    const { stream, mimeType, fileSize } = await this.mediaService.getMediaStream(mediaAssetId);

    res.setHeader('Content-Type', mimeType);
    if (fileSize) {
      res.setHeader('Content-Length', fileSize.toString());
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.pipe(res);
  }
}
