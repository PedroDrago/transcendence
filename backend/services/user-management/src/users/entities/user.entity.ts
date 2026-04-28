import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsString, IsNotEmpty, IsOptional, IsUrl, IsDateString } from 'class-validator';

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

  @Column({ default: 'default-avatar.png' })
  @IsUrl()
  @IsOptional()
  avatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
