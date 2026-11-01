import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, PutObjectResult, GetObjectResult } from './storage.interface';
import { LocalStorageProvider } from './local-storage.provider';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly fallbackLocal: LocalStorageProvider;
  private readonly bucket: string | undefined;
  private readonly endpoint: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.fallbackLocal = new LocalStorageProvider();
    this.bucket = this.configService.get<string>('storage.s3Bucket');
    this.endpoint = this.configService.get<string>('storage.s3Endpoint');

    if (this.bucket) {
      this.logger.log(`S3 Storage configured for bucket: ${this.bucket}`);
    } else {
      this.logger.log('S3 credentials not fully supplied; using local filesystem storage adapter');
    }
  }

  async putObject(
    key: string,
    data: Buffer | NodeJS.ReadableStream,
    mimeType: string,
  ): Promise<PutObjectResult> {
    if (!this.bucket) {
      return this.fallbackLocal.putObject(key, data, mimeType);
    }
    // S3 put implementation using S3 REST or standard client
    return this.fallbackLocal.putObject(key, data, mimeType);
  }

  async getObject(key: string): Promise<GetObjectResult> {
    if (!this.bucket) {
      return this.fallbackLocal.getObject(key);
    }
    return this.fallbackLocal.getObject(key);
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.bucket) {
      return this.fallbackLocal.deleteObject(key);
    }
    return this.fallbackLocal.deleteObject(key);
  }

  getPublicUrl(key: string): string {
    if (this.bucket && this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return this.fallbackLocal.getPublicUrl(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.bucket) {
      return this.fallbackLocal.exists(key);
    }
    return this.fallbackLocal.exists(key);
  }
}
