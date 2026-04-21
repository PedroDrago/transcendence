import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

export const OAUTH_STATE_COOKIE = 'oauth_state';

export interface OAuthStateCookie {
  state: string;
  value: string;
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createOAuthStateCookie(
  secret: string,
  ttlSeconds = 300,
): OAuthStateCookie {
  const state = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = `${state}.${expiresAt}`;

  return {
    state,
    value: `${payload}.${sign(payload, secret)}`,
  };
}

export function verifyOAuthStateCookie(
  cookieValue: string | undefined,
  returnedState: unknown,
  secret: string,
): boolean {
  if (!cookieValue || typeof returnedState !== 'string') return false;

  const parts = cookieValue.split('.');
  if (parts.length !== 3) return false;

  const [state, expiresAtRaw, signature] = parts;
  if (state !== returnedState) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(`${state}.${expiresAtRaw}`, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }

  return undefined;
}
