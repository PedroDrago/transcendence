import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getAuthenticatedUserFromToken } from './access-token';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
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
    return getAuthenticatedUserFromToken(payload);
  }
}
