import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ProfileSyncService } from './profile-sync.service';

type JwtUserPayload = {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  usernamePending: boolean;
  isTwoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly profileSyncService: ProfileSyncService,
  ) {}

  async validateUser(identifier: string, password: string) {
    const user = await this.usersService.findByUsernameOrEmail(identifier);
    if (!user || !user.passwordHash) return null;

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.username, dto.email, passwordHash);

    try {
      await this.profileSyncService.createProfile({
        id: user.id,
        username: user.username,
      });
    } catch (error) {
      await this.usersService.deleteById(user.id).catch(() => undefined);
      throw this.profileSyncService.toHttpException(
        error,
        'User profile could not be created',
      );
    }

    return { message: 'registered', user };
  }

  login(user: JwtUserPayload) {
    if (user.isTwoFactorEnabled) {
      const payload = {
        typ: '2fa',
        sub: user.id,
      };
      return { 
        access_token: this.jwtService.sign(payload, { expiresIn: '5m' }),
        requires2fa: true,
      };
    }

    const payload = {
      typ: 'access',
      sub: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      usernamePending: user.usernamePending,
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  async generateTwoFactorAuthenticationSecret(user: JwtUserPayload) {
    const otplib = await import('otplib');
    const qrcode = await import('qrcode');
    const secret = otplib.authenticator.generateSecret();

    const otpauthUrl = otplib.authenticator.keyuri(
      user.email,
      'Transcendence',
      secret
    );

    const userEntity = await this.usersService.findById(user.id);
    if (userEntity) {
      userEntity.twoFactorSecret = secret;
      // We don't enable it yet until they confirm
      await this.usersService['usersRepository'].save(userEntity);
    }

    return {
      qrCodeDataUrl: await qrcode.toDataURL(otpauthUrl),
    };
  }

  async turnOnTwoFactorAuthentication(userId: string, code: string) {
    const otplib = await import('otplib');
    const user = await this.usersService.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }

    const isCodeValid = otplib.authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }

    user.isTwoFactorEnabled = true;
    await this.usersService['usersRepository'].save(user);
    return { message: '2FA enabled' };
  }

  async turnOffTwoFactorAuthentication(userId: string, code: string) {
    const otplib = await import('otplib');
    const user = await this.usersService.findById(userId);
    if (!user || !user.twoFactorSecret || !user.isTwoFactorEnabled) {
      throw new BadRequestException('2FA not enabled');
    }

    const isCodeValid = otplib.authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.usersService['usersRepository'].save(user);
    return { message: '2FA disabled' };
  }

  async authenticateTwoFactor(userId: string, code: string) {
    const otplib = await import('otplib');
    const user = await this.usersService.findById(userId);
    if (!user || !user.twoFactorSecret || !user.isTwoFactorEnabled) {
      throw new BadRequestException('2FA not enabled');
    }

    const isCodeValid = otplib.authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }

    return this.login({
      ...user,
      isTwoFactorEnabled: false, // Bypass 2FA check to get full token
    });
  }

  async updateUsername(userId: string, username: string) {
    const previousUser = await this.usersService.findById(userId);
    if (!previousUser) {
      throw new NotFoundException('User not found');
    }

    const user = await this.usersService.updateUsername(userId, username);

    try {
      await this.profileSyncService.updateUsername(user.id, user.username);
    } catch (error) {
      await this.usersService
        .restoreUsernameState(
          previousUser.id,
          previousUser.username,
          previousUser.usernamePending,
        )
        .catch(() => undefined);
      throw this.profileSyncService.toHttpException(
        error,
        'User profile username could not be updated',
      );
    }

    return {
      message: 'username updated',
      access_token: this.jwtService.sign({
        typ: 'access',
        sub: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        usernamePending: user.usernamePending,
      }),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        usernamePending: user.usernamePending,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) {
      throw new BadRequestException('OAuth accounts cannot change password');
    }

    const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!match) throw new ForbiddenException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('New password must differ from current');

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, newHash);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.profileSyncService.deleteProfile(userId);
    } catch (error) {
      throw this.profileSyncService.toHttpException(
        error,
        'User profile could not be deleted',
      );
    }

    await this.usersService.deleteById(userId);
  }

  createOAuthHandoffToken(accessToken: string, requires2fa?: boolean) {
    return this.jwtService.sign(
      { access_token: accessToken, typ: 'oauth_handoff', requires2fa: !!requires2fa },
      { expiresIn: '60s' },
    );
  }

  exchangeOAuthHandoffToken(token: string) {
    try {
      const payload = this.jwtService.verify<{ access_token: string; typ: string; requires2fa?: boolean }>(token);
      if (payload.typ !== 'oauth_handoff' || !payload.access_token) {
        throw new UnauthorizedException('Invalid OAuth handoff token');
      }
      return { access_token: payload.access_token, requires2fa: !!payload.requires2fa };
    } catch {
      throw new UnauthorizedException('Invalid OAuth handoff token');
    }
  }
}
