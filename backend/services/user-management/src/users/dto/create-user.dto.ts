import { IsString, IsNotEmpty, IsUUID, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsUUID('4', { message: 'The user ID must be a UUID v4.' })
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username must contain only letters, numbers, underscores, and hyphens.' })
  username: string;
}
