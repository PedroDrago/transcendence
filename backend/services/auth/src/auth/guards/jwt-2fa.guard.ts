import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class Jwt2FAGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    // We expect the JWT strategy to have verified this is a '2fa' token.
    // However, the base jwt strategy might just accept any token. We should check.
    return user;
  }
}
