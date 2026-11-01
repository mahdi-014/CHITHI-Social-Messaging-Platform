import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string; // username or email

  @IsString()
  @IsNotEmpty()
  password!: string;
}
