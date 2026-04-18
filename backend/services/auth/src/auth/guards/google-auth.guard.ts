import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import {
  createOAuthStateCookie,
  OAUTH_STATE_COOKIE,
  readCookie,
  verifyOAuthStateCookie,
} from '../oauth-state';

type RequestWithOAuthState = Request & { oauthState?: string };

abstract class BaseGoogleStartGuard extends AuthGuard('google') {
  protected constructor(
    protected readonly config: ConfigService,
    private readonly callbackUrlEnv: string,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithOAuthState>();
    const response = context.switchToHttp().getResponse<Response>();
    const stateCookie = createOAuthStateCookie(
      this.config.getOrThrow<string>('JWT_SECRET'),
    );

    request.oauthState = stateCookie.state;
    response.cookie(OAUTH_STATE_COOKIE, stateCookie.value, {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      path: '/auth/google',
      sameSite: 'lax',
      secure: false,
    });

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithOAuthState>();

    return {
      callbackURL: this.config.getOrThrow<string>(this.callbackUrlEnv),
      scope: ['email', 'profile'],
      session: false,
      state: request.oauthState,
    };
  }
}

abstract class BaseGoogleCallbackGuard extends AuthGuard('google') {
  protected constructor(
    protected readonly config: ConfigService,
    private readonly callbackUrlEnv: string,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const cookieValue = readCookie(request.headers.cookie, OAUTH_STATE_COOKIE);
    const isValidState = verifyOAuthStateCookie(
      cookieValue,
      request.query.state,
      this.config.getOrThrow<string>('JWT_SECRET'),
    );

    response.clearCookie(OAUTH_STATE_COOKIE, { path: '/auth/google' });

    if (!isValidState) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions() {
    return {
      callbackURL: this.config.getOrThrow<string>(this.callbackUrlEnv),
      session: false,
    };
  }
}

@Injectable()
export class GoogleAuthGuard extends BaseGoogleStartGuard {
  constructor(config: ConfigService) {
    super(config, 'GOOGLE_CALLBACK_URL');
  }
}

@Injectable()
export class GoogleCallbackGuard extends BaseGoogleCallbackGuard {
  constructor(config: ConfigService) {
    super(config, 'GOOGLE_CALLBACK_URL');
  }
}

@Injectable()
export class GoogleTestAuthGuard extends BaseGoogleStartGuard {
  constructor(config: ConfigService) {
    super(config, 'GOOGLE_TEST_CALLBACK_URL');
  }
}

@Injectable()
export class GoogleTestCallbackGuard extends BaseGoogleCallbackGuard {
  constructor(config: ConfigService) {
    super(config, 'GOOGLE_TEST_CALLBACK_URL');
  }
}
