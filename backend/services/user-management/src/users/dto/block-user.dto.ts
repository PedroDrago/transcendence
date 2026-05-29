import { IsNotEmpty, IsUUID } from 'class-validator';

export class BlockUserDto {
  @IsUUID('4', { message: 'The blockedId must be a valid UUID.' })
  @IsNotEmpty()
  blockedId: string;
}
