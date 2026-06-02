import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import type { Response } from 'express';
import {
  AVATAR_OUTPUT_MIME_TYPE,
  AVATAR_UPLOAD_DIRECTORY,
  DEFAULT_AVATAR_ASSET_PATH,
  DEFAULT_AVATAR_FILENAME,
  DEFAULT_AVATAR_MIME_TYPE,
} from './avatar.constants';
import { getAvatarUploadPath } from './avatar.utils';
import { UsersController } from './users.controller';
import type { AvatarUploadFile } from './users.service';
import { UsersService } from './users.service';
import { BlockService } from './block.service';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findOne' | 'update' | 'updateAvatar' | 'create' | 'remove' | 'updateUsername'>
  >;
  let blockService: jest.Mocked<Pick<BlockService, 'getBlockStatus'>>;

  beforeEach(() => {
    usersService = {
      findOne: jest.fn(),
      update: jest.fn(),
      updateAvatar: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      updateUsername: jest.fn(),
    };

    blockService = {
      getBlockStatus: jest.fn(),
    };

    controller = new UsersController(
      usersService as unknown as UsersService,
      blockService as unknown as BlockService
    );
  });

  afterEach(async () => {
    await rm(getAvatarUploadPath(`${USER_ID}.webp`), { force: true });
  });

  it('delegates profile creation to the service', async () => {
    const createUserDto = { id: USER_ID, username: 'alice' };
    const profile = { id: USER_ID, username: 'alice', avatarUrl: '/users/avatars/default.webp' };
    usersService.create.mockResolvedValue(profile as any);

    await expect(controller.create(createUserDto)).resolves.toBe(profile);

    expect(usersService.create).toHaveBeenCalledWith(createUserDto);
  });

  it('delegates profile removal to the service', async () => {
    usersService.remove.mockResolvedValue(undefined);

    await expect(controller.remove(USER_ID, USER_ID)).resolves.toBeUndefined();

    expect(usersService.remove).toHaveBeenCalledWith(USER_ID);
  });

  it('rejects profile removal if requesterId does not match id', async () => {
    const otherId = '550e8400-e29b-41d4-a716-446655440002';
    await expect(controller.remove(USER_ID, otherId)).rejects.toThrow(ForbiddenException);
  });

  describe('findMe', () => {
    it('returns the user profile', async () => {
      const profile = { id: USER_ID, username: 'alice' };
      usersService.findOne.mockResolvedValue(profile as any);
      await expect(controller.findMe(USER_ID)).resolves.toBe(profile);
      expect(usersService.findOne).toHaveBeenCalledWith(USER_ID);
    });

    it('rejects if x-user-id is missing or invalid', () => {
      expect(() => controller.findMe('')).toThrow(BadRequestException);
    });
  });

  describe('updateMe', () => {
    it('updates the user profile', async () => {
      const dto = { displayName: 'Alice' };
      const profile = { id: USER_ID, username: 'alice', displayName: 'Alice' };
      usersService.update.mockResolvedValue(profile as any);
      await expect(controller.updateMe(USER_ID, dto)).resolves.toBe(profile);
      expect(usersService.update).toHaveBeenCalledWith(USER_ID, dto);
    });
  });

  describe('updateUsername', () => {
    it('updates the username when requester matches the target user', async () => {
      const profile = { id: USER_ID, username: 'alice_updated' };
      usersService.updateUsername.mockResolvedValue(profile as any);

      await expect(
        controller.updateUsername(USER_ID, USER_ID, { username: 'alice_updated' }),
      ).resolves.toBe(profile);

      expect(usersService.updateUsername).toHaveBeenCalledWith(USER_ID, 'alice_updated');
    });

    it('rejects username updates for another user', async () => {
      const otherId = '550e8400-e29b-41d4-a716-446655440002';

      expect(() =>
        controller.updateUsername(USER_ID, otherId, { username: 'alice_updated' }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('returns the user profile if not blocked', async () => {
      const otherId = '550e8400-e29b-41d4-a716-446655440002';
      blockService.getBlockStatus.mockResolvedValue({ isBlocked: false } as any);
      const profile = { id: otherId, username: 'bob' };
      usersService.findOne.mockResolvedValue(profile as any);
      await expect(controller.findOne(USER_ID, otherId)).resolves.toBe(profile);
    });

    it('throws NotFoundException if user is blocked', async () => {
      const otherId = '550e8400-e29b-41d4-a716-446655440002';
      blockService.getBlockStatus.mockResolvedValue({ isBlocked: true } as any);
      await expect(controller.findOne(USER_ID, otherId)).rejects.toThrow(NotFoundException);
    });
  });

  it('delegates avatar uploads to the service', async () => {
    const file: AvatarUploadFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimetype: 'image/jpeg',
      size: 3,
    };
    const profile = { id: USER_ID, avatarUrl: `/users/avatars/${USER_ID}.webp` };
    usersService.updateAvatar.mockResolvedValue(profile);

    await expect(controller.updateMyAvatar(USER_ID, file)).resolves.toBe(profile);

    expect(usersService.updateAvatar).toHaveBeenCalledWith(USER_ID, file);
  });

  it('rejects avatar uploads without the user id header', () => {
    expect(() => controller.updateMyAvatar('', undefined)).toThrow(
      BadRequestException,
    );
  });

  it('serves the default avatar with a strict content type', async () => {
    const response = createResponseMock();

    await controller.getAvatar(DEFAULT_AVATAR_FILENAME, response);

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      DEFAULT_AVATAR_MIME_TYPE,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(response.sendFile).toHaveBeenCalledWith(DEFAULT_AVATAR_ASSET_PATH, expect.any(Function));
  });

  it('serves uploaded avatars from the upload directory', async () => {
    const filename = `${USER_ID}.webp`;
    const response = createResponseMock();

    await mkdir(AVATAR_UPLOAD_DIRECTORY, { recursive: true });
    await writeFile(getAvatarUploadPath(filename), Buffer.from('avatar'));

    await controller.getAvatar(filename, response);

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      AVATAR_OUTPUT_MIME_TYPE,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(response.sendFile).toHaveBeenCalledWith(getAvatarUploadPath(filename), expect.any(Function));
  });

  it('rejects unsafe avatar filenames', async () => {
    await expect(
      controller.getAvatar('../default-avatar.png', createResponseMock()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createResponseMock(): Response {
  return {
    setHeader: jest.fn(),
    sendFile: jest.fn((path, cb) => {
      if (cb) cb();
    }),
  } as unknown as Response;
}
