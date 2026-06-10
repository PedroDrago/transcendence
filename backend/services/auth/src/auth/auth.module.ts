import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProfileSyncService } from './profile-sync.service';
import {
  GoogleAuthGuard,
  GoogleCallbackGuard,
  GoogleTestAuthGuard,
  GoogleTestCallbackGuard,
} from './guards/google-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { Jwt2FAStrategy } from './strategies/jwt-2fa.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ProfileSyncService,
    LocalStrategy,
    LocalAuthGuard,
    JwtStrategy,
    Jwt2FAStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
    GoogleCallbackGuard,
    GoogleTestAuthGuard,
    GoogleTestCallbackGuard,
  ],
})
export class AuthModule {}
