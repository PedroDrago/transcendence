import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ length: 100, unique: true })
	username: string;

	@Column({ length: 255, unique: true })
	email: string;

	@Column({ type: 'varchar', length: 120, nullable: true })
	displayName: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	avatarUrl: string | null;

	@Column({ type: 'text', nullable: true })
	bio: string | null;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
