import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { OAuthProvider, User } from './user.entity';

export interface OAuthProfile {
  oauthId: string;
  oauthProvider: OAuthProvider;
  email: string;
  displayName?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ username });
  }

  findByUsernameOrEmail(identifier: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.passwordHash = passwordHash;
    await this.usersRepository.save(user);
  }

  async updateUsername(id: string, username: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.findByUsername(username);
    if (existing && existing.id !== id) {
      throw new ConflictException('Username already exists');
    }

    try {
      user.username = username;
      user.usernamePending = false;
      await this.usersRepository.save(user);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('Username already exists');
      }
      throw err;
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new InternalServerErrorException('User not found after username update');
    }
    return updated;
  }

  async create(
    username: string,
    email: string,
    passwordHash: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepository.create({
      username,
      email,
      passwordHash,
      oauthProvider: OAuthProvider.LOCAL,
      oauthId: null,
      usernamePending: false,
    });
    try {
      const saved = await this.usersRepository.save(user);
      const { passwordHash: _, ...safeUser } = saved;
      return safeUser;
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('Username or email already exists');
      }
      throw err;
    }
  }

  async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
    const byOAuthId = await this.usersRepository.findOneBy({
      oauthId: profile.oauthId,
      oauthProvider: profile.oauthProvider,
    });
    if (byOAuthId) return byOAuthId;

    const byEmail = await this.findByEmail(profile.email);
    if (byEmail) {
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepository.create({
      username: await this.generateTemporaryUsername(profile.displayName, profile.email),
      email: profile.email,
      oauthId: profile.oauthId,
      oauthProvider: profile.oauthProvider,
      passwordHash: null,
      usernamePending: true,
    });

    try {
      return await this.usersRepository.save(user);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('OAuth user already exists');
      }
      throw err;
    }
  }

  private async generateTemporaryUsername(
    displayName: string | undefined,
    email: string,
  ): Promise<string> {
    const preferredBase = this.usernameBase(displayName) || this.usernameBase(email.split('@')[0]);
    const base = preferredBase || 'user';
    const suffix = randomUUID().replace(/-/g, '').slice(0, 12);
    const maxBaseLength = 20 - suffix.length - 1;
    const trimmedBase = base.slice(0, Math.max(maxBaseLength, 3)) || 'user';
    return `${trimmedBase}_${suffix}`;
  }

  private usernameBase(value: string | undefined): string {
    return (value ?? '')
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .slice(0, 20);
  }
}
