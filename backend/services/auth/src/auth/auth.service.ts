import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.passwordHash) return null;

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.username, dto.email, passwordHash);
    return { message: 'registered', user };
  }

  login(user: { id: string; username: string }) {
    const payload = { sub: user.id, username: user.username };
    return { access_token: this.jwtService.sign(payload) };
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

  createOAuthHandoffToken(accessToken: string) {
    return this.jwtService.sign(
      { access_token: accessToken, typ: 'oauth_handoff' },
      { expiresIn: '60s' },
    );
  }

  exchangeOAuthHandoffToken(token: string) {
    try {
      const payload = this.jwtService.verify<{ access_token: string; typ: string }>(token);
      if (payload.typ !== 'oauth_handoff' || !payload.access_token) {
        throw new UnauthorizedException('Invalid OAuth handoff token');
      }
      return { access_token: payload.access_token };
    } catch {
      throw new UnauthorizedException('Invalid OAuth handoff token');
    }
  }
}
