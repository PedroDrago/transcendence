import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum OAuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  SCHOOL42 = '42',
}

@Entity({ name: 'users', schema: 'auth' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  username: string;

  @Column({ nullable: true })
  passwordHash: string | null;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ type: 'enum', enum: OAuthProvider, default: OAuthProvider.LOCAL })
  oauthProvider: OAuthProvider;

  @Column({ length: 255, nullable: true })
  oauthId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
