import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { BlockService } from './block.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly blockService: BlockService,
  ) {}

  async sendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot send a friend request to yourself.');
    }

    const [requester, addressee] = await Promise.all([
      this.userRepository.findOne({ where: { id: requesterId } }),
      this.userRepository.findOne({ where: { id: addresseeId } }),
    ]);

    if (!requester) {
      throw new NotFoundException('Requester not found.');
    }
    if (!addressee) {
      throw new NotFoundException('Addressee not found.');
    }

    // Execute block check and friendship creation atomically using SERIALIZABLE isolation
    // to prevent race conditions where a block is applied concurrently after the check.
    try {
      return await this.friendshipRepository.manager.transaction('SERIALIZABLE', async (manager) => {
        if (await this.blockService.isBlocked(requesterId, addresseeId, manager)) {
          throw new ForbiddenException('Cannot interact with a blocked user.');
        }

        // Check for existing friendship to handle the REJECTED state machine
        const existingFriendship = await manager.findOne(Friendship, {
          where: [
            { requesterId, addresseeId },
            { requesterId: addresseeId, addresseeId: requesterId },
          ],
        });

        if (existingFriendship) {
          if (existingFriendship.status === FriendshipStatus.PENDING) {
            throw new ConflictException('A friend request already exists between these users.');
          }
          if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
            throw new ConflictException('These users are already friends.');
          }

          // If it was rejected, we allow sending a new request by reviving the old one
          existingFriendship.requesterId = requesterId;
          existingFriendship.addresseeId = addresseeId;
          existingFriendship.status = FriendshipStatus.PENDING;
          return manager.save(existingFriendship);
        }

        try {
          const newFriendship = manager.create(Friendship, {
            requesterId,
            addresseeId,
            status: FriendshipStatus.PENDING,
          });
          return await manager.save(newFriendship);
        } catch (error) {
          // Postgres Unique Violation error code (handles race conditions)
          if ((error as any).code === '23505') {
            throw new ConflictException('A friend request already exists between these users.');
          }
          throw error;
        }
      });
    } catch (error) {
      if ((error as any).code === '40001') { // Postgres serialization failure
        throw new ConflictException('Concurrent operation detected. Please try again.');
      }
      throw error;
    }
  }

  async updateRequestStatus(userId: string, friendshipId: string, status: FriendshipStatus): Promise<Friendship> {
    try {
      return await this.friendshipRepository.manager.transaction('SERIALIZABLE', async (manager) => {
        const friendship = await manager.findOne(Friendship, { where: { id: friendshipId } });

        if (!friendship) {
          throw new NotFoundException('Friendship request not found.');
        }

        if (friendship.addresseeId !== userId) {
          throw new ForbiddenException('You can only respond to requests sent to you.');
        }

        if (await this.blockService.isBlocked(friendship.requesterId, friendship.addresseeId, manager)) {
          throw new ForbiddenException('Cannot interact with a blocked user.');
        }

        if (friendship.status !== FriendshipStatus.PENDING) {
          throw new BadRequestException('You can only respond to PENDING requests.');
        }

        friendship.status = status;
        return manager.save(friendship);
      });
    } catch (error) {
      if ((error as any).code === '40001') {
        throw new ConflictException('Concurrent operation detected. Please try again.');
      }
      throw error;
    }
  }

  async getFriends(userId: string) {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });

    // Map over friendships, return the *other* user, and serialize it to prevent data leaks
    return friendships.map(f => {
      const friendEntity = f.requesterId === userId ? f.addressee : f.requester;
      return this.usersService.serializeProfile(friendEntity);
    });
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });

    return friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
  }

  async getPendingRequests(userId: string) {
    const requests = await this.friendshipRepository.find({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'], // Include requester details
    });

    // Serialize the requester profile to prevent data leaks
    return requests.map(req => ({
      ...req,
      requester: this.usersService.serializeProfile(req.requester),
    }));
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const result = await this.friendshipRepository.createQueryBuilder()
      .delete()
      .where('status = :status', { status: FriendshipStatus.ACCEPTED })
      .andWhere('( ("requesterId" = :userId AND "addresseeId" = :friendId) OR ("requesterId" = :friendId AND "addresseeId" = :userId) )', { userId, friendId })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('Friendship not found.');
    }
  }
}
