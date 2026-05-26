import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Block } from './entities/block.entity';
import { User } from './entities/user.entity';
import { Friendship } from './entities/friendship.entity';
import { UsersService } from './users.service';

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async blockUser(blockerId: string, blockedId: string): Promise<Block> {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself.');
    }

    const [blocker, blocked] = await Promise.all([
      this.userRepository.findOne({ where: { id: blockerId } }),
      this.userRepository.findOne({ where: { id: blockedId } }),
    ]);

    if (!blocker || !blocked) {
      throw new NotFoundException('User not found.');
    }

    // Perform block creation and friendship deletion in a transaction
    try {
      return await this.dataSource.transaction(async (manager) => {
        const newBlock = manager.create(Block, { blockerId, blockedId });
        const savedBlock = await manager.save(Block, newBlock);

        // Delete any existing friendships or pending requests between the two users
        await manager.delete(Friendship, [
          { requesterId: blockerId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: blockerId },
        ]);

        return savedBlock;
      });
    } catch (error) {
      if ((error as any).code === '23505') { // Postgres unique violation
        throw new ConflictException('You have already blocked this user.');
      }
      throw error;
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const block = await this.blockRepository.findOne({ where: { blockerId, blockedId } });

    if (!block) {
      throw new NotFoundException('Block record not found.');
    }

    await this.blockRepository.remove(block);
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.blockRepository.find({
      where: { blockerId: userId },
      relations: ['blocked'],
    });

    return blocks.map((block) => this.usersService.serializeProfile(block.blocked));
  }

  async getBlockStatus(userId: string, targetId: string) {
    const blocks = await this.blockRepository.find({
      where: [
        { blockerId: userId, blockedId: targetId },
        { blockerId: targetId, blockedId: userId },
      ],
    });

    const blockedByMe = blocks.some((b) => b.blockerId === userId && b.blockedId === targetId);
    const blockedMe = blocks.some((b) => b.blockerId === targetId && b.blockedId === userId);

    return {
      blockedByMe,
      blockedMe,
      isBlocked: blockedByMe || blockedMe,
    };
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const blockCount = await this.blockRepository.count({
      where: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    });

    return blockCount > 0;
  }
}
