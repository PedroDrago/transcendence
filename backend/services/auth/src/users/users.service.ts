import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { OAuthProvider, User } from './user.entity';

export interface OAuthProfile {
  oauthId: string;
  oauthProvider: OAuthProvider;
  email: string;
  username: string;
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

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { passwordHash });
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
      username: profile.username,
      email: profile.email,
      oauthId: profile.oauthId,
      oauthProvider: profile.oauthProvider,
      passwordHash: null,
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
}
