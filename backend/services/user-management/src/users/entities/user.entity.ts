import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { DEFAULT_AVATAR_PUBLIC_PATH } from '../avatar.constants';

@Entity('profiles')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsString()
  @IsNotEmpty()
  username: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  displayName: string;

  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  bio: string;

  // Stores the date in 'YYYY-MM-DD' format
  @Column({ type: 'date', nullable: true })
  @IsDateString()
  @IsOptional()
  dateOfBirth: string;

  @Column({ default: DEFAULT_AVATAR_PUBLIC_PATH })
  @IsString()
  @IsOptional()
  avatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
