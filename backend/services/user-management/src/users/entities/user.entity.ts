import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DEFAULT_AVATAR_PUBLIC_PATH } from '../avatar.constants';

@Entity('profiles')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  // Stores the date in 'YYYY-MM-DD' format
  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ default: DEFAULT_AVATAR_PUBLIC_PATH })
  avatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
