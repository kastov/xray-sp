import { IsString, MaxLength } from 'class-validator';
import type { LoginRequest } from '@status/shared';

export class LoginDto implements LoginRequest {
  @IsString()
  @MaxLength(200)
  username!: string;

  @IsString()
  @MaxLength(200)
  password!: string;
}
