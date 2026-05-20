import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';
import { User } from './entities/user.entity';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async sendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot send a friend request to yourself.');
    }

    const addressee = await this.userRepository.findOne({ where: { id: addresseeId } });
    if (!addressee) {
      throw new NotFoundException('Addressee not found.');
    }

    const existingFriendship = await this.friendshipRepository.findOne({
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

      // If it was rejected, we can allow sending a new request by updating the old one
      existingFriendship.requesterId = requesterId;
      existingFriendship.addresseeId = addresseeId;
      existingFriendship.status = FriendshipStatus.PENDING;
      return this.friendshipRepository.save(existingFriendship);
    }

    const newFriendship = this.friendshipRepository.create({
      requesterId,
      addresseeId,
      status: FriendshipStatus.PENDING,
    });

    return this.friendshipRepository.save(newFriendship);
  }

  async updateRequestStatus(userId: string, friendshipId: string, status: FriendshipStatus): Promise<Friendship> {
    const friendship = await this.friendshipRepository.findOne({ where: { id: friendshipId } });

    if (!friendship) {
      throw new NotFoundException('Friendship request not found.');
    }

    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('You can only respond to requests sent to you.');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('You can only respond to PENDING requests.');
    }

    friendship.status = status;
    return this.friendshipRepository.save(friendship);
  }

  async getFriends(userId: string): Promise<User[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });

    // Map over friendships and return the *other* user
    return friendships.map(f => (f.requesterId === userId ? f.addressee : f.requester));
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    return this.friendshipRepository.find({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'], // Include requester details so the user knows who sent it
    });
  }
}
