import { Injectable, Logger, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, PutObjectResult, GetObjectResult } from './storage.interface';
import * as path from 'path';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;

  constructor(@Optional() private readonly configService?: ConfigService) {
    const custom = this.configService?.get<string>('storage.localPath');
    this.baseDir = custom || path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolveSafePath(key: string): string {
    // Prevent directory traversal
    const safeKey = key.replace(/\\/g, '/');
    const resolved = path.resolve(this.baseDir, safeKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new BadRequestException('Invalid storage key: directory traversal prohibited');
    }
    return resolved;
  }

  async putObject(
    key: string,
    data: Buffer | NodeJS.ReadableStream,
    mimeType: string,
  ): Promise<PutObjectResult> {
    const fullPath = this.resolveSafePath(key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (Buffer.isBuffer(data)) {
      await fs.promises.writeFile(fullPath, data);
      return { key, size: data.length };
    } else {
      const writeStream = fs.createWriteStream(fullPath);
      await pipeline(data, writeStream);
      const stat = await fs.promises.stat(fullPath);
      return { key, size: stat.size };
    }
  }

  async getObject(key: string, range?: { start: number; end: number }): Promise<GetObjectResult> {
    const fullPath = this.resolveSafePath(key);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Object not found in storage');
    }

    const stat = await fs.promises.stat(fullPath);
    const stream = range
      ? fs.createReadStream(fullPath, { start: range.start, end: range.end })
      : fs.createReadStream(fullPath);
    return {
      stream,
      contentLength: range ? range.end - range.start + 1 : stat.size,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const fullPath = this.resolveSafePath(key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  getPublicUrl(key: string): string {
    return `/api/v1/media/file/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(key);
    return fs.existsSync(fullPath);
  }
}
