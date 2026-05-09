import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: {
    typ: string;
    sub: string;
    username: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    usernamePending: boolean;
  }) {
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
}
