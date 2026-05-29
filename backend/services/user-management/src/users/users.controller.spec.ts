import { BadRequestException, NotFoundException } from '@nestjs/common';
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

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findOne' | 'update' | 'updateAvatar' | 'create' | 'remove'>
  >;

  beforeEach(() => {
    usersService = {
      findOne: jest.fn(),
      update: jest.fn(),
      updateAvatar: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    controller = new UsersController(usersService as unknown as UsersService);
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

    await expect(controller.remove(USER_ID)).resolves.toBeUndefined();

    expect(usersService.remove).toHaveBeenCalledWith(USER_ID);
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
    expect(response.sendFile).toHaveBeenCalledWith(DEFAULT_AVATAR_ASSET_PATH);
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
    expect(response.sendFile).toHaveBeenCalledWith(getAvatarUploadPath(filename));
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
    sendFile: jest.fn(),
  } as unknown as Response;
}
