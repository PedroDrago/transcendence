import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,
	) { }

	async findOne(id: string) {
		const user = await this.usersRepository.findOne({ where: { id } });

		if (!user) {
			throw new NotFoundException('User not found');
		}

		let age: number | null = null;
		if (user.dateOfBirth) {
			const dob = new Date(user.dateOfBirth);
			const ageDifMs = Date.now() - dob.getTime();
			const ageDate = new Date(ageDifMs);
			age = Math.abs(ageDate.getUTCFullYear() - 1970);
		}

		const { dateOfBirth, ...userWithoutDob } = user;

		return {
			...userWithoutDob,
			age,
		};
	}

	async update(id: string, updateProfileDto: UpdateProfileDto) {
		const user = await this.usersRepository.findOne({ where: { id } });

		if (!user) {
			throw new NotFoundException('User not found');
		}

		Object.assign(user, updateProfileDto);
		await this.usersRepository.save(user);

		return this.findOne(id);
	}
}
