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

  const userId1 = '11111111-1111-4111-a111-111111111111';
  const userId2 = '22222222-2222-4222-a222-222222222222';
  const friendshipId = '33333333-3333-4333-a333-333333333333';

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
    mockFriendsService.sendRequest.mockResolvedValue({ id: friendshipId });
    const result = await controller.sendRequest(userId1, { addresseeId: userId2 });
    expect(result).toEqual({ id: friendshipId });
    expect(mockFriendsService.sendRequest).toHaveBeenCalledWith(userId1, userId2);
  });

  it('should update request status', async () => {
    mockFriendsService.updateRequestStatus.mockResolvedValue({ id: friendshipId, status: FriendshipStatus.ACCEPTED });
    const result = await controller.updateRequestStatus(userId2, friendshipId, { status: FriendshipStatus.ACCEPTED });
    expect(result).toEqual({ id: friendshipId, status: FriendshipStatus.ACCEPTED });
    expect(mockFriendsService.updateRequestStatus).toHaveBeenCalledWith(userId2, friendshipId, FriendshipStatus.ACCEPTED);
  });

  it('should get friends', async () => {
    mockFriendsService.getFriends.mockResolvedValue([{ id: userId2 }]);
    const result = await controller.getFriends(userId1);
    expect(result).toEqual([{ id: userId2 }]);
    expect(mockFriendsService.getFriends).toHaveBeenCalledWith(userId1);
  });

  it('should get pending requests', async () => {
    mockFriendsService.getPendingRequests.mockResolvedValue([{ id: friendshipId }]);
    const result = await controller.getPendingRequests(userId1);
    expect(result).toEqual([{ id: friendshipId }]);
    expect(mockFriendsService.getPendingRequests).toHaveBeenCalledWith(userId1);
  });
});
