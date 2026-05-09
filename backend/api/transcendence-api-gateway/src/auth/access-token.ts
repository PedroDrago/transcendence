import { UnauthorizedException } from '@nestjs/common';

type AccessTokenPayload = {
  typ: string;
  sub: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  usernamePending: boolean;
};

export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  usernamePending: boolean;
};

export function getAuthenticatedUserFromToken(
  payload: AccessTokenPayload,
): AuthenticatedUser {
  if (
    payload.typ !== 'access' ||
    !payload.sub ||
    !payload.username ||
    !payload.email ||
    !payload.createdAt ||
    !payload.updatedAt
  ) {
    throw new UnauthorizedException('Invalid access token');
  }

  return {
    id: payload.sub,
    username: payload.username,
    email: payload.email,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    usernamePending: payload.usernamePending,
  };
}
