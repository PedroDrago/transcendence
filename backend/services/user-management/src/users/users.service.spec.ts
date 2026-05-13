import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { Repository } from 'typeorm';
import {
  AVATAR_MAX_SIZE_BYTES,
  AVATAR_UPLOAD_DIRECTORY,
  DEFAULT_AVATAR_FILENAME,
  DEFAULT_AVATAR_PUBLIC_PATH,
} from './avatar.constants';
import { getAvatarPublicPath, getAvatarUploadPath } from './avatar.utils';
import { User } from './entities/user.entity';
import { AvatarUploadFile, UsersService } from './users.service';

const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const USER_AVATAR_PATH = getAvatarPublicPath(`${USER_ID}.webp`);

type UsersRepositoryMock = jest.Mocked<Pick<Repository<User>, 'findOne' | 'save' | 'create' | 'remove'>>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: UsersRepositoryMock;

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (user: User) => user),
      create: jest.fn(),
      remove: jest.fn(),
    };

    service = new UsersService(usersRepository as unknown as Repository<User>);
  });

  afterEach(async () => {
    await Promise.all([
      rm(getAvatarUploadPath(`${USER_ID}.webp`), { force: true }),
      rm(getAvatarUploadPath(`${USER_ID}.jpg`), { force: true }),
      rm(getAvatarUploadPath(`${USER_ID}.png`), { force: true }),
    ]);
  });

  it('normalizes missing and legacy default avatar values', async () => {
    usersRepository.findOne.mockResolvedValue(
      createUser({ avatarUrl: DEFAULT_AVATAR_FILENAME }),
    );

    await expect(service.findOne(USER_ID)).resolves.toMatchObject({
      id: USER_ID,
      avatarUrl: DEFAULT_AVATAR_PUBLIC_PATH,
    });
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a user and returns a serialized profile', async () => {
    const createUserDto = { id: USER_ID, username: 'alice' };
    const user = createUser();
    usersRepository.create.mockReturnValue(user);
    usersRepository.save.mockResolvedValue(user);

    await expect(service.create(createUserDto as any)).resolves.toMatchObject({
      id: USER_ID,
      username: 'alice',
    });

    expect(usersRepository.create).toHaveBeenCalledWith(createUserDto);
    expect(usersRepository.save).toHaveBeenCalledWith(user);
  });

  it('removes a user successfully', async () => {
    const user = createUser();
    usersRepository.findOne.mockResolvedValue(user);
    usersRepository.remove.mockResolvedValue(user);

    await expect(service.remove(USER_ID)).resolves.toBeUndefined();

    expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
    expect(usersRepository.remove).toHaveBeenCalledWith(user);
  });

  it('throws NotFoundException when removing a non-existent user', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.remove(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('processes valid avatars as 256px WebP files and persists the relative URL', async () => {
    const user = createUser();
    const file = await createPngUploadFile();
    const legacyAvatarPath = getAvatarUploadPath(`${USER_ID}.jpg`);

    usersRepository.findOne.mockResolvedValue(user);
    await mkdir(AVATAR_UPLOAD_DIRECTORY, { recursive: true });
    await writeFile(legacyAvatarPath, Buffer.from('old avatar'));

    await expect(service.updateAvatar(USER_ID, file)).resolves.toMatchObject({
      id: USER_ID,
      avatarUrl: USER_AVATAR_PATH,
    });

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ avatarUrl: USER_AVATAR_PATH }),
    );

    const metadata = await sharp(getAvatarUploadPath(`${USER_ID}.webp`)).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
    await expect(access(legacyAvatarPath)).rejects.toThrow();
  });

  it('rejects missing avatar files', async () => {
    usersRepository.findOne.mockResolvedValue(createUser());

    await expect(service.updateAvatar(USER_ID, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects oversized avatar files', async () => {
    usersRepository.findOne.mockResolvedValue(createUser());

    await expect(
      service.updateAvatar(USER_ID, {
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
        mimetype: 'image/jpeg',
        size: AVATAR_MAX_SIZE_BYTES + 1,
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects unsupported or spoofed image content', async () => {
    usersRepository.findOne.mockResolvedValue(createUser());

    await expect(
      service.updateAvatar(USER_ID, {
        buffer: Buffer.from('not an image'),
        mimetype: 'image/png',
        size: 12,
      }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });
});

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    username: 'alice',
    displayName: undefined as unknown as string,
    bio: undefined as unknown as string,
    dateOfBirth: undefined as unknown as string,
    avatarUrl: DEFAULT_AVATAR_PUBLIC_PATH,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

async function createPngUploadFile(): Promise<AvatarUploadFile> {
  const buffer = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 60, g: 120, b: 180 },
    },
  })
    .png()
    .toBuffer();

  return {
    buffer,
    mimetype: 'image/png',
    size: buffer.length,
  };
}
