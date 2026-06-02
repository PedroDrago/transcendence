import { Controller, Post, Body, Headers, Patch, Param, Get, Delete, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { UpdateFriendRequestDto } from './dto/update-friend-request.dto';

@Controller('users/friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  private validateUserId(userId: string) {
    if (!userId || !isUUID(userId, '4')) {
      throw new BadRequestException('Invalid or missing x-user-id header');
    }
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  sendRequest(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateFriendRequestDto,
  ) {
    this.validateUserId(userId);
    return this.friendsService.sendRequest(userId, dto.addresseeId);
  }

  @Patch('requests/:id')
  updateRequestStatus(
    @Headers('x-user-id') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) friendshipId: string,
    @Body() dto: UpdateFriendRequestDto,
  ) {
    this.validateUserId(userId);
    return this.friendsService.updateRequestStatus(userId, friendshipId, dto.status);
  }

  @Get()
  getFriends(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    return this.friendsService.getFriends(userId);
  }

  @Get('requests')
  getPendingRequests(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    return this.friendsService.getPendingRequests(userId);
  }

  @Get(':id/ids')
  getFriendIds(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.friendsService.getFriendIds(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFriend(
    @Headers('x-user-id') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) friendId: string,
  ) {
    this.validateUserId(userId);
    return this.friendsService.removeFriend(userId, friendId);
  }
}
