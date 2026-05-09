import {
  DEFAULT_AVATAR_FILENAME,
  DEFAULT_AVATAR_PUBLIC_PATH,
} from './avatar.constants';
import {
  detectAvatarImage,
  getAvatarFilename,
  getAvatarPublicPath,
  getValidatedAvatarImage,
  isAvatarFileSizeAllowed,
  isSafeAvatarFilename,
} from './avatar.utils';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('avatar utils', () => {
  it('detects supported image signatures', () => {
    expect(detectAvatarImage(Buffer.from([0xff, 0xd8, 0xff]))).toMatchObject({
      mimeType: 'image/jpeg',
      extension: 'jpg',
    });
    expect(
      detectAvatarImage(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toMatchObject({ mimeType: 'image/png', extension: 'png' });
    expect(
      detectAvatarImage(Buffer.from('RIFF1234WEBP', 'ascii')),
    ).toMatchObject({ mimeType: 'image/webp', extension: 'webp' });
  });

  it('rejects MIME spoofing', () => {
    expect(
      getValidatedAvatarImage('image/png', Buffer.from([0xff, 0xd8, 0xff])),
    ).toBeNull();
  });

  it('validates the 2MB file-size boundary', () => {
    expect(isAvatarFileSizeAllowed(0)).toBe(false);
    expect(isAvatarFileSizeAllowed(2 * 1024 * 1024)).toBe(true);
    expect(isAvatarFileSizeAllowed(2 * 1024 * 1024 + 1)).toBe(false);
  });

  it('creates and validates public avatar paths', () => {
    const filename = getAvatarFilename(USER_ID);

    expect(filename).toBe(`${USER_ID}.webp`);
    expect(getAvatarPublicPath(filename)).toBe(`/users/avatars/${filename}`);
    expect(getAvatarPublicPath(DEFAULT_AVATAR_FILENAME)).toBe(
      DEFAULT_AVATAR_PUBLIC_PATH,
    );
  });

  it('allows only the default avatar and UUID WebP filenames', () => {
    expect(isSafeAvatarFilename(DEFAULT_AVATAR_FILENAME)).toBe(true);
    expect(isSafeAvatarFilename(`${USER_ID}.webp`)).toBe(true);
    expect(isSafeAvatarFilename(`${USER_ID}.png`)).toBe(false);
    expect(isSafeAvatarFilename('../default-avatar.png')).toBe(false);
  });
});
