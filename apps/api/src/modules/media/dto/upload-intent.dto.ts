import { IsString, IsNotEmpty, IsNumber, IsEnum, Min, Max } from 'class-validator';

export enum MediaCategoryEnum {
  AVATAR = 'avatar',
  COVER = 'cover',
  POST_IMAGE = 'post_image',
  POST_VIDEO = 'post_video',
  CHAT_ATTACHMENT = 'chat_attachment',
}

export class UploadIntentDto {
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsNumber()
  @Min(1)
  @Max(104857600) // Max 100 MB
  fileSize!: number;

  @IsEnum(MediaCategoryEnum)
  category!: MediaCategoryEnum;

  @IsString()
  @IsNotEmpty()
  fileName!: string;
}
