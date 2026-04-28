import { Controller, Get, Body, Patch, Param, Headers, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) { }

	@Get('me')
	findMe(@Headers('x-user-id') userId: string) {
		if (!userId) {
			throw new BadRequestException('Missing x-user-id header');
		}
		return this.usersService.findOne(userId);
	}

	@Patch('me')
	updateMe(
		@Headers('x-user-id') userId: string,
		@Body() updateProfileDto: UpdateProfileDto,
	) {
		if (!userId) {
			throw new BadRequestException('Missing x-user-id header');
		}
		return this.usersService.update(userId, updateProfileDto);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.usersService.findOne(id);
	}
}
