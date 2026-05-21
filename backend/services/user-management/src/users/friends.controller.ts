import { Controller, Post, Body, Headers, Patch, Param, Get, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { UpdateFriendRequestDto } from './dto/update-friend-request.dto';

@Controller('users/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  sendRequest(
    @Headers('x-user-id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(userId, dto.addresseeId);
  }

  @Patch('requests/:id')
  updateRequestStatus(
    @Headers('x-user-id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) friendshipId: string,
    @Body() dto: UpdateFriendRequestDto,
  ) {
    return this.friendsService.updateRequestStatus(userId, friendshipId, dto.status);
  }

  @Get()
  getFriends(@Headers('x-user-id', new ParseUUIDPipe({ version: '4' })) userId: string) {
    return this.friendsService.getFriends(userId);
  }

  @Get('requests')
  getPendingRequests(@Headers('x-user-id', new ParseUUIDPipe({ version: '4' })) userId: string) {
    return this.friendsService.getPendingRequests(userId);
  }
}

