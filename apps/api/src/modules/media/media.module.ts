import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { FriendshipsModule } from '../friendships/friendships.module';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';

@Module({
  imports: [ConfigModule, FriendshipsModule, JwtModule.register({})],
  controllers: [MediaController],
  providers: [MediaService, LocalStorageProvider, S3StorageProvider],
  exports: [MediaService],
})
export class MediaModule {}
