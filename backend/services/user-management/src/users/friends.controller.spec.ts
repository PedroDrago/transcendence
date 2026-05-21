import { Test, TestingModule } from '@nestjs/testing';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FriendshipStatus } from './entities/friendship.entity';

describe('FriendsController', () => {
  let controller: FriendsController;
  let service: FriendsService;

  const mockFriendsService = {
    sendRequest: jest.fn(),
    updateRequestStatus: jest.fn(),
    getFriends: jest.fn(),
    getPendingRequests: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [
        {
          provide: FriendsService,
          useValue: mockFriendsService,
        },
      ],
    }).compile();

    controller = module.get<FriendsController>(FriendsController);
    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should send a request', async () => {
    mockFriendsService.sendRequest.mockResolvedValue({ id: 'f-1' });
    const result = await controller.sendRequest('user-1', { addresseeId: 'user-2' });
    expect(result).toEqual({ id: 'f-1' });
    expect(mockFriendsService.sendRequest).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('should update request status', async () => {
    mockFriendsService.updateRequestStatus.mockResolvedValue({ id: 'f-1', status: FriendshipStatus.ACCEPTED });
    const result = await controller.updateRequestStatus('user-2', 'f-1', { status: FriendshipStatus.ACCEPTED });
    expect(result).toEqual({ id: 'f-1', status: FriendshipStatus.ACCEPTED });
    expect(mockFriendsService.updateRequestStatus).toHaveBeenCalledWith('user-2', 'f-1', FriendshipStatus.ACCEPTED);
  });

  it('should get friends', async () => {
    mockFriendsService.getFriends.mockResolvedValue([{ id: 'user-2' }]);
    const result = await controller.getFriends('user-1');
    expect(result).toEqual([{ id: 'user-2' }]);
    expect(mockFriendsService.getFriends).toHaveBeenCalledWith('user-1');
  });

  it('should get pending requests', async () => {
    mockFriendsService.getPendingRequests.mockResolvedValue([{ id: 'f-1' }]);
    const result = await controller.getPendingRequests('user-1');
    expect(result).toEqual([{ id: 'f-1' }]);
    expect(mockFriendsService.getPendingRequests).toHaveBeenCalledWith('user-1');
  });
});
