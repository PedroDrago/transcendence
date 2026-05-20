import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Friendship } from './entities/friendship.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Friendship])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
