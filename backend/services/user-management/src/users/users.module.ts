import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Friendship } from './entities/friendship.entity';
import { Block } from './entities/block.entity';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Friendship, Block])],
  controllers: [FriendsController, UsersController],
  providers: [UsersService, FriendsService],
})
export class UsersModule {}
