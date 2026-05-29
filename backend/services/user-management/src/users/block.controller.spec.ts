import { Test, TestingModule } from '@nestjs/testing';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';
import { BadRequestException } from '@nestjs/common';

describe('BlockController', () => {
  let controller: BlockController;
  let service: BlockService;

  const mockBlockService = {
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    getBlockedUsers: jest.fn(),
    getBlockStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockController],
      providers: [
        {
          provide: BlockService,
          useValue: mockBlockService,
        },
      ],
    }).compile();

    controller = module.get<BlockController>(BlockController);
    service = module.get<BlockService>(BlockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('blockUser', () => {
    it('should block a user successfully', async () => {
      const blockerId = 'b0b1...';
      const blockedId = 'c0c1...';
      mockBlockService.blockUser.mockResolvedValue({ id: '1', blockerId, blockedId });

      const result = await controller.blockUser(blockerId, { blockedId });
      expect(service.blockUser).toHaveBeenCalledWith(blockerId, blockedId);
      expect(result).toEqual({ id: '1', blockerId, blockedId });
    });

    it('should throw BadRequestException if x-user-id is missing or invalid', async () => {
      await expect(controller.blockUser('', { blockedId: 'c0c1...' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user successfully', async () => {
      const blockerId = 'b0b1b2b3-c4c5-d6d7-e8e9-f0f1f2f3f4f5';
      const blockedId = 'c0c1c2c3-d4d5-e6e7-f8f9-a0a1a2a3a4a5';
      mockBlockService.unblockUser.mockResolvedValue(undefined);

      await controller.unblockUser(blockerId, blockedId);
      expect(service.unblockUser).toHaveBeenCalledWith(blockerId, blockedId);
    });
  });

  describe('getBlockedUsers', () => {
    it('should get blocked users', async () => {
      const userId = 'b0b1b2b3-c4c5-d6d7-e8e9-f0f1f2f3f4f5';
      mockBlockService.getBlockedUsers.mockResolvedValue([{ id: 'c0c1...' }]);

      const result = await controller.getBlockedUsers(userId);
      expect(service.getBlockedUsers).toHaveBeenCalledWith(userId);
      expect(result).toEqual([{ id: 'c0c1...' }]);
    });
  });

  describe('getBlockStatus', () => {
    it('should return block status', async () => {
      const requesterId = 'b0b1b2b3-c4c5-d6d7-e8e9-f0f1f2f3f4f5';
      const targetId = 'c0c1c2c3-d4d5-e6e7-f8f9-a0a1a2a3a4a5';
      mockBlockService.getBlockStatus.mockResolvedValue({ isBlocked: true, iBlockedThem: true, theyBlockedMe: false });

      const result = await controller.getBlockStatus(requesterId, targetId);
      expect(service.getBlockStatus).toHaveBeenCalledWith(requesterId, targetId);
      expect(result).toEqual({ isBlocked: true, iBlockedThem: true, theyBlockedMe: false });
    });
  });
});
