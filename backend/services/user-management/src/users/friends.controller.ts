import { Controller, Post, Body, Headers, Patch, Param, Get, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { UpdateFriendRequestDto } from './dto/update-friend-request.dto';

@Controller('users/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  sendRequest(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateFriendRequestDto,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return this.friendsService.sendRequest(userId, dto.addresseeId);
  }

  @Patch('requests/:id')
  updateRequestStatus(
    @Headers('x-user-id') userId: string,
    @Param('id') friendshipId: string,
    @Body() dto: UpdateFriendRequestDto,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return this.friendsService.updateRequestStatus(userId, friendshipId, dto.status);
  }

  @Get()
  getFriends(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return this.friendsService.getFriends(userId);
  }

  @Get('requests')
  getPendingRequests(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return this.friendsService.getPendingRequests(userId);
  }
}
