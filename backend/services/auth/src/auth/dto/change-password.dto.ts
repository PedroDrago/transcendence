import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'supersecret', minLength: 8, maxLength: 256 })
  @IsString()
  @Length(8, 256)
  currentPassword: string;

  @ApiProperty({ example: 'newpassword', minLength: 8, maxLength: 256 })
  @IsString()
  @Length(8, 256)
  newPassword: string;
}
