import { Test, TestingModule } from '@nestjs/testing';
import { BlockService } from './block.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Block } from './entities/block.entity';
import { Friendship } from './entities/friendship.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BlockService', () => {
  let service: BlockService;
  let blockRepo: Repository<Block>;
  let friendRepo: Repository<Friendship>;
  let dataSource: DataSource;

  const mockBlockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFriendRepo = {};
  const mockUserRepo = {
    findOne: jest.fn(),
  };
  const mockUsersService = {
    serializeProfile: jest.fn().mockImplementation((user) => user),
  };

  const mockQueryBuilder = {
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(true),
  };

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockDataSource = {
    transaction: jest.fn((isolationLevel, cb) => {
      if (typeof isolationLevel === 'function') {
        return isolationLevel(mockEntityManager);
      }
      return cb(mockEntityManager);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        {
          provide: getRepositoryToken(Block),
          useValue: mockBlockRepo,
        },
        {
          provide: getRepositoryToken(Friendship),
          useValue: mockFriendRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<BlockService>(BlockService);
    blockRepo = module.get<Repository<Block>>(getRepositoryToken(Block));
    friendRepo = module.get<Repository<Friendship>>(getRepositoryToken(Friendship));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blockUser', () => {
    it('should throw BadRequestException if users are the same', async () => {
      await expect(service.blockUser('user1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should block a user and delete friendships in a transaction', async () => {
      const blockerId = 'user1';
      const blockedId = 'user2';
      const block = { id: '1', blockerId, blockedId };
      
      mockUserRepo.findOne.mockResolvedValue({});
      mockEntityManager.create.mockReturnValue(block);
      mockEntityManager.save.mockResolvedValue(block);

      const result = await service.blockUser(blockerId, blockedId);

      expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
      expect(mockEntityManager.create).toHaveBeenCalledWith(Block, { blockerId, blockedId });
      expect(mockEntityManager.save).toHaveBeenCalledWith(Block, block);
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(result).toEqual(block);
    });
  });

  describe('unblockUser', () => {
    it('should remove the block record', async () => {
      const blockerId = 'user1';
      const blockedId = 'user2';
      const block = { id: '1', blockerId, blockedId };
      mockBlockRepo.findOne.mockResolvedValue(block as any);

      await service.unblockUser(blockerId, blockedId);

      expect(blockRepo.findOne).toHaveBeenCalledWith({ where: { blockerId, blockedId } });
      expect(blockRepo.remove).toHaveBeenCalledWith(block);
    });

    it('should throw NotFoundException if block record is not found', async () => {
      mockBlockRepo.findOne.mockResolvedValue(null);
      await expect(service.unblockUser('user1', 'user2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return a list of blocked users', async () => {
      const userId = 'user1';
      const blocks = [
        { blocked: { id: 'user2', username: 'john' } }
      ];
      mockBlockRepo.find.mockResolvedValue(blocks as any);

      const result = await service.getBlockedUsers(userId);

      expect(blockRepo.find).toHaveBeenCalledWith({
        where: { blockerId: userId },
        relations: ['blocked'],
      });
      expect(result).toEqual([{ id: 'user2', username: 'john' }]);
    });
  });

  describe('getBlockStatus', () => {
    it('should return correct status', async () => {
      mockBlockRepo.find.mockResolvedValue([
        { blockerId: 'user1', blockedId: 'user2' }
      ] as any);

      const result = await service.getBlockStatus('user1', 'user2');

      expect(result).toEqual({
        isBlocked: true,
        blockedByMe: true,
        blockedMe: false,
      });
    });
  });
});
