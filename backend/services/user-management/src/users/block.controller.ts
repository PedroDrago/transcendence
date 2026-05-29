import { Controller, Post, Body, Headers, Param, Get, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException, Delete } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { BlockService } from './block.service';
import { BlockUserDto } from './dto/block-user.dto';

@Controller('users/blocks')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  private validateUserId(userId: string) {
    if (!userId || !isUUID(userId, '4')) {
      throw new BadRequestException('Invalid or missing x-user-id header');
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  blockUser(
    @Headers('x-user-id') userId: string,
    @Body() dto: BlockUserDto,
  ) {
    this.validateUserId(userId);
    return this.blockService.blockUser(userId, dto.blockedId);
  }

  @Delete(':blockedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unblockUser(
    @Headers('x-user-id') userId: string,
    @Param('blockedId', new ParseUUIDPipe({ version: '4' })) blockedId: string,
  ) {
    this.validateUserId(userId);
    return this.blockService.unblockUser(userId, blockedId);
  }

  @Get()
  getBlockedUsers(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    return this.blockService.getBlockedUsers(userId);
  }

  @Get(':targetId/status')
  getBlockStatus(
    @Headers('x-user-id') userId: string,
    @Param('targetId', new ParseUUIDPipe({ version: '4' })) targetId: string,
  ) {
    this.validateUserId(userId);
    return this.blockService.getBlockStatus(userId, targetId);
  }
}
