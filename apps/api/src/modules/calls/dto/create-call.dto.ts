import { IsNotEmpty, IsUUID, IsIn } from 'class-validator';

export class CreateCallDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId!: string;

  @IsIn(['audio', 'video'])
  @IsNotEmpty()
  callType!: 'audio' | 'video';
}

