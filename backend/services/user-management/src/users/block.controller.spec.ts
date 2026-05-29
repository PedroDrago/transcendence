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
      const blockerId = '550e8400-e29b-41d4-a716-446655440001';
      const blockedId = '550e8400-e29b-41d4-a716-446655440002';
      mockBlockService.blockUser.mockResolvedValue({ id: '1', blockerId, blockedId });

      const result = await controller.blockUser(blockerId, { blockedId });
      expect(service.blockUser).toHaveBeenCalledWith(blockerId, blockedId);
      expect(result).toEqual({ id: '1', blockerId, blockedId });
    });

    it('should throw BadRequestException if x-user-id is missing or invalid', () => {
      expect(() => controller.blockUser('', { blockedId: '550e8400-e29b-41d4-a716-446655440002' })).toThrow(BadRequestException);
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user successfully', async () => {
      const blockerId = '550e8400-e29b-41d4-a716-446655440001';
      const blockedId = '550e8400-e29b-41d4-a716-446655440002';
      mockBlockService.unblockUser.mockResolvedValue(undefined);

      await controller.unblockUser(blockerId, blockedId);
      expect(service.unblockUser).toHaveBeenCalledWith(blockerId, blockedId);
    });
  });

  describe('getBlockedUsers', () => {
    it('should get blocked users', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      mockBlockService.getBlockedUsers.mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440002' }]);

      const result = await controller.getBlockedUsers(userId);
      expect(service.getBlockedUsers).toHaveBeenCalledWith(userId);
      expect(result).toEqual([{ id: '550e8400-e29b-41d4-a716-446655440002' }]);
    });
  });

  describe('getBlockStatus', () => {
    it('should return block status', async () => {
      const requesterId = '550e8400-e29b-41d4-a716-446655440001';
      const targetId = '550e8400-e29b-41d4-a716-446655440002';
      mockBlockService.getBlockStatus.mockResolvedValue({ isBlocked: true, iBlockedThem: true, theyBlockedMe: false });

      const result = await controller.getBlockStatus(requesterId, targetId);
      expect(service.getBlockStatus).toHaveBeenCalledWith(requesterId, targetId);
      expect(result).toEqual({ isBlocked: true, iBlockedThem: true, theyBlockedMe: false });
    });
  });
});
