import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsUUID()
  avatarMediaId?: string;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string;
}
