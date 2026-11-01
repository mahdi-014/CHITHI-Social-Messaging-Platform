import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum PostTypeEnum {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  MIXED = 'mixed',
}

export class CreatePostDto {
  @IsEnum(PostTypeEnum)
  postType!: PostTypeEnum;

  @ValidateIf((o) => o.postType === PostTypeEnum.TEXT || !o.mediaAssetIds?.length)
  @IsString()
  @MaxLength(3000)
  contentText?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mediaAssetIds?: string[];
}
