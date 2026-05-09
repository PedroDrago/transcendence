import { join } from 'node:path';

export const AVATAR_FIELD_NAME = 'avatar';
export const AVATAR_PUBLIC_PATH_PREFIX = '/users/avatars';
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const AVATAR_IMAGE_SIZE_PIXELS = 256;
export const AVATAR_UPLOAD_DIRECTORY = join(process.cwd(), 'uploads', 'avatars');

export const DEFAULT_AVATAR_FILENAME = 'default-avatar.png';
export const DEFAULT_AVATAR_MIME_TYPE = 'image/png';
export const DEFAULT_AVATAR_PUBLIC_PATH = `${AVATAR_PUBLIC_PATH_PREFIX}/${DEFAULT_AVATAR_FILENAME}`;
export const DEFAULT_AVATAR_ASSET_PATH = join(
  process.cwd(),
  'public',
  'avatars',
  DEFAULT_AVATAR_FILENAME,
);

export const AVATAR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];
export type AvatarExtension = 'jpg' | 'png' | 'webp';
export type AvatarOutputExtension = 'webp';

export const AVATAR_OUTPUT_EXTENSION: AvatarOutputExtension = 'webp';
export const AVATAR_OUTPUT_MIME_TYPE = 'image/webp';
export const AVATAR_LEGACY_EXTENSIONS: Exclude<
  AvatarExtension,
  AvatarOutputExtension
>[] = ['jpg', 'png'];

export const AVATAR_EXTENSION_BY_MIME_TYPE: Record<
  AvatarMimeType,
  AvatarExtension
> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
