import { IsString, IsNotEmpty, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsUUID('4', { message: 'The user ID must be a UUID v4.' })
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  username: string;
}
