import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'drago or drago@example.com', minLength: 3, maxLength: 255 })
    @IsString()
    @MinLength(3)
    @MaxLength(255)
    identifier: string;

    @ApiProperty({ example: 'supersecret', minLength: 8, maxLength: 256 })
    @IsString()
    @MinLength(8)
    @MaxLength(256)
    password: string;
}
