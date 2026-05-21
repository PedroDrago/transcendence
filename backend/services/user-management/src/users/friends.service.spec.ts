import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('FriendsService', () => {
  let service: FriendsService;
  let friendshipRepo: Repository<Friendship>;
  let userRepo: Repository<User>;

  const mockFriendshipRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockUsersService = {
    serializeProfile: jest.fn((user) => ({ ...user, age: 25 })),
  };

  const userId1 = '11111111-1111-4111-a111-111111111111';
  const userId2 = '22222222-2222-4222-a222-222222222222';
  const friendshipId = '33333333-3333-4333-a333-333333333333';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: getRepositoryToken(Friendship), useValue: mockFriendshipRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    friendshipRepo = module.get(getRepositoryToken(Friendship));
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('should throw BadRequestException if requester is the same as addressee', async () => {
      await expect(service.sendRequest(userId1, userId1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if requester or addressee is missing', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: userId2 });
      await expect(service.sendRequest(userId1, userId2)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if request already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'some-id' });
      mockFriendshipRepo.findOne.mockResolvedValue({ status: FriendshipStatus.PENDING });
      await expect(service.sendRequest(userId1, userId2)).rejects.toThrow(ConflictException);
    });

    it('should revive a REJECTED request instead of creating a new one', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'some-id' });
      const rejectedFriendship = { status: FriendshipStatus.REJECTED, requesterId: userId2, addresseeId: userId1 };
      mockFriendshipRepo.findOne.mockResolvedValue(rejectedFriendship);
      mockFriendshipRepo.save.mockResolvedValue({ ...rejectedFriendship, status: FriendshipStatus.PENDING });

      const result = await service.sendRequest(userId1, userId2);
      expect(result.status).toBe(FriendshipStatus.PENDING);
      expect(mockFriendshipRepo.save).toHaveBeenCalled();
    });

    it('should correctly save a new request', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'some-id' });
      mockFriendshipRepo.findOne.mockResolvedValue(null);
      mockFriendshipRepo.create.mockReturnValue({ requesterId: userId1, addresseeId: userId2, status: FriendshipStatus.PENDING });
      mockFriendshipRepo.save.mockResolvedValue({ id: friendshipId });

      await expect(service.sendRequest(userId1, userId2)).resolves.toEqual({ id: friendshipId });
    });
  });

  describe('updateRequestStatus', () => {
    it('should throw ForbiddenException if user is not the addressee', async () => {
      mockFriendshipRepo.findOne.mockResolvedValue({ addresseeId: userId2 });
      await expect(service.updateRequestStatus(userId1, friendshipId, FriendshipStatus.ACCEPTED)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if status is not PENDING', async () => {
      mockFriendshipRepo.findOne.mockResolvedValue({ addresseeId: userId1, status: FriendshipStatus.ACCEPTED });
      await expect(service.updateRequestStatus(userId1, friendshipId, FriendshipStatus.REJECTED)).rejects.toThrow(BadRequestException);
    });

    it('should correctly update status', async () => {
      const friendship = { addresseeId: userId1, status: FriendshipStatus.PENDING };
      mockFriendshipRepo.findOne.mockResolvedValue(friendship);
      mockFriendshipRepo.save.mockResolvedValue({ ...friendship, status: FriendshipStatus.ACCEPTED });

      const result = await service.updateRequestStatus(userId1, friendshipId, FriendshipStatus.ACCEPTED);
      expect(result.status).toBe(FriendshipStatus.ACCEPTED);
    });
  });
  
  describe('getFriends and getPendingRequests', () => {
    it('should correctly serialize users', async () => {
      const friendship = { requesterId: userId1, addressee: { id: userId2 } };
      mockFriendshipRepo.find.mockResolvedValue([friendship]);
      
      const result = await service.getFriends(userId1);
      expect(result).toEqual([{ id: userId2, age: 25 }]); // mocked serializeProfile
      expect(mockUsersService.serializeProfile).toHaveBeenCalledWith({ id: userId2 });
    });
  });
});
