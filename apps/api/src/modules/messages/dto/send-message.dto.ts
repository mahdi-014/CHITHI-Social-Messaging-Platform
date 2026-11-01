import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateIf,
  MaxLength,
} from 'class-validator';

export enum MessageTypeEnum {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  VOICE = 'voice',
  FILE = 'file',
  SYSTEM = 'system',
}

export class SendMessageDto {
  @IsOptional()
  @IsUUID()
  clientMessageId?: string;

  @IsEnum(MessageTypeEnum)
  messageType!: MessageTypeEnum;

  @ValidateIf((o) => o.messageType === MessageTypeEnum.TEXT || !o.attachmentMediaIds?.length)
  @IsString()
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentMediaIds?: string[];
}
