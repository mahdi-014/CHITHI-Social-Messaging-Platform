import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateDirectConversationDto {
  @IsUUID()
  @IsNotEmpty()
  friendId!: string;
}
