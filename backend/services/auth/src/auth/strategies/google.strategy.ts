import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { OAuthProvider } from '../../users/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    const isVerifiedEmail = profile.emails?.[0]?.verified;

    if (!email || isVerifiedEmail !== true) {
      throw new UnauthorizedException('Google account must provide a verified email');
    }

    try {
      return await this.usersService.findOrCreateOAuthUser({
        oauthId: profile.id,
        oauthProvider: OAuthProvider.GOOGLE,
        email,
        displayName: profile.displayName,
      });
    } catch (err) {
      if (err instanceof ConflictException) {
        throw new UnauthorizedException('Email is already registered');
      }
      throw err;
    }
  }
}
