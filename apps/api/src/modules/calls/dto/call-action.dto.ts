import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CallActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}
