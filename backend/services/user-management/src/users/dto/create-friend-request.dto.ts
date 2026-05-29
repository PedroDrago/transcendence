import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateFriendRequestDto {
  @IsUUID()
  @IsNotEmpty()
  addresseeId: string;
}
