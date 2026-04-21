import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUsernameDto {
  @ApiProperty({ example: 'drago', minLength: 3, maxLength: 20 })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;
}
