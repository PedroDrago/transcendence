import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    if (!user) return null;

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.username, passwordHash);
    return { message: 'registered', user };
  }

  login(user: { id: string; username: string }) {
    const payload = { sub: user.id, username: user.username };
    return { access_token: this.jwtService.sign(payload) };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!match) throw new ForbiddenException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('New password must differ from current');

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, newHash);
  }
}
