import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ProfileSyncService } from './profile-sync.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let profileSyncService: jest.Mocked<ProfileSyncService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updatePassword: jest.fn(),
            updateUsername: jest.fn(),
            restoreUsernameState: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        {
          provide: ProfileSyncService,
          useValue: {
            createProfile: jest.fn(),
            updateUsername: jest.fn(),
            toHttpException: jest.fn((_error, message) => new Error(message)),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'token'),
            verify: jest.fn(() => ({
              access_token: 'access-token',
              typ: 'oauth_handoff',
            })),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    profileSyncService = module.get(ProfileSyncService) as jest.Mocked<ProfileSyncService>;
    usersService.deleteById.mockResolvedValue(undefined);
    usersService.restoreUsernameState.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a profile after local registration', async () => {
    const user = createAuthUser({ username: 'alice' });
    usersService.create.mockResolvedValue(user);

    await expect(
      service.register({
        username: 'alice',
        email: 'alice@example.com',
        password: 'supersecret123',
      }),
    ).resolves.toEqual({ message: 'registered', user });

    expect(profileSyncService.createProfile).toHaveBeenCalledWith({
      id: user.id,
      username: 'alice',
    });
  });

  it('rolls back auth registration when profile creation fails', async () => {
    const user = createAuthUser({ username: 'alice' });
    usersService.create.mockResolvedValue(user);
    profileSyncService.createProfile.mockRejectedValue(new Error('user service down'));

    await expect(
      service.register({
        username: 'alice',
        email: 'alice@example.com',
        password: 'supersecret123',
      }),
    ).rejects.toThrow('User profile could not be created');

    expect(usersService.deleteById).toHaveBeenCalledWith(user.id);
  });

  it('updates the profile username after auth username changes', async () => {
    const previous = createAuthUser({ username: 'alice' });
    const updated = createAuthUser({ username: 'alice_updated' });
    usersService.findById.mockResolvedValue(previous);
    usersService.updateUsername.mockResolvedValue(updated as any);

    await expect(service.updateUsername(previous.id, 'alice_updated')).resolves.toMatchObject({
      message: 'username updated',
      user: { username: 'alice_updated' },
    });

    expect(profileSyncService.updateUsername).toHaveBeenCalledWith(
      previous.id,
      'alice_updated',
    );
  });

  it('rolls back auth username when profile username sync fails', async () => {
    const previous = createAuthUser({ username: 'alice', usernamePending: true });
    const updated = createAuthUser({ username: 'alice_updated', usernamePending: false });
    usersService.findById.mockResolvedValue(previous);
    usersService.updateUsername.mockResolvedValue(updated as any);
    profileSyncService.updateUsername.mockRejectedValue(new Error('user service down'));

    await expect(service.updateUsername(previous.id, 'alice_updated')).rejects.toThrow(
      'User profile username could not be updated',
    );

    expect(usersService.restoreUsernameState).toHaveBeenCalledWith(
      previous.id,
      'alice',
      true,
    );
  });
});

function createAuthUser(overrides: Partial<any> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'alice',
    email: 'alice@example.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    usernamePending: false,
    ...overrides,
  };
}
