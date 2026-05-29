import { IsIn, IsNotEmpty } from 'class-validator';
import { FriendshipStatus } from '../entities/friendship.entity';

export class UpdateFriendRequestDto {
  @IsIn([FriendshipStatus.ACCEPTED, FriendshipStatus.REJECTED], {
    message: 'status must be either ACCEPTED or REJECTED',
  })
  @IsNotEmpty()
  status: FriendshipStatus;
}
