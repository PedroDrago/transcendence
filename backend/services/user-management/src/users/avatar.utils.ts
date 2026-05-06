import { join } from 'node:path';
import {
  AVATAR_ALLOWED_MIME_TYPES,
  AVATAR_EXTENSION_BY_MIME_TYPE,
  AVATAR_MAX_SIZE_BYTES,
  AVATAR_PUBLIC_PATH_PREFIX,
  AVATAR_UPLOAD_DIRECTORY,
  AvatarExtension,
  AvatarMimeType,
  DEFAULT_AVATAR_FILENAME,
} from './avatar.constants';

type AvatarImageInfo = {
  mimeType: AvatarMimeType;
  extension: AvatarExtension;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const AVATAR_FILENAME_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(jpg|png|webp)$/;

export function isAllowedAvatarMimeType(
  mimeType: string,
): mimeType is AvatarMimeType {
  return AVATAR_ALLOWED_MIME_TYPES.includes(mimeType as AvatarMimeType);
}

export function isAvatarFileSizeAllowed(size: number): boolean {
  return size > 0 && size <= AVATAR_MAX_SIZE_BYTES;
}

export function detectAvatarImage(buffer: Buffer): AvatarImageInfo | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  if (
    buffer.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  return null;
}

export function getValidatedAvatarImage(
  mimeType: string,
  buffer: Buffer,
): AvatarImageInfo | null {
  if (!isAllowedAvatarMimeType(mimeType)) {
    return null;
  }

  const detectedImage = detectAvatarImage(buffer);

  if (!detectedImage || detectedImage.mimeType !== mimeType) {
    return null;
  }

  return {
    mimeType,
    extension: AVATAR_EXTENSION_BY_MIME_TYPE[mimeType],
  };
}

export function getAvatarFilename(
  userId: string,
  extension: AvatarExtension,
): string {
  return `${userId}.${extension}`;
}

export function isSafeAvatarFilename(filename: string): boolean {
  return filename === DEFAULT_AVATAR_FILENAME || AVATAR_FILENAME_PATTERN.test(filename);
}

export function getAvatarPublicPath(filename: string): string {
  return `${AVATAR_PUBLIC_PATH_PREFIX}/${filename}`;
}

export function getAvatarUploadPath(filename: string): string {
  return join(AVATAR_UPLOAD_DIRECTORY, filename);
}
