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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MediaService } from './media.service';
import { UploadIntentDto } from './dto/upload-intent.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

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
    const access = await this.mediaService.getMediaAccess(mediaAssetId);
    const filePath = this.mediaService.getFilePath(access.storageKey);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(filePath);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.status(HttpStatus.OK).json({ success: true, mediaAssetId });
    });

    writeStream.on('error', (err) => {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
    });
  }

  @Public()
  @Get(':id/file')
  async streamFile(
    @Param('id', ParseUUIDPipe) mediaAssetId: string,
    @Res() res: Response,
  ) {
    const access = await this.mediaService.getMediaAccess(mediaAssetId);
    const filePath = this.mediaService.getFilePath(access.storageKey);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File does not exist on disk');
    }

    res.setHeader('Content-Type', access.mimeType);
    fs.createReadStream(filePath).pipe(res);
  }
}
