import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'drago', minLength: 3, maxLength: 20 })
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    username: string;

    @ApiProperty({ example: 'drago@example.com', maxLength: 255 })
    @IsEmail()
    @MaxLength(255)
    email: string;

    @ApiProperty({ example: 'supersecret', minLength: 8, maxLength: 256 })
    @IsString()
    @MinLength(8)
    @MaxLength(256)
    password: string;
}
