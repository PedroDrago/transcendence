import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Friendship } from './entities/friendship.entity';
import { Block } from './entities/block.entity';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Friendship, Block])],
  controllers: [BlockController, FriendsController, UsersController],
  providers: [UsersService, FriendsService, BlockService],
})
export class UsersModule {}
