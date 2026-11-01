import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  contentText!: string;
}
