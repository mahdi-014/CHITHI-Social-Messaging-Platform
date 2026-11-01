import { IsUUID, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID()
  @IsNotEmpty()
  receiverId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  message?: string;
}
