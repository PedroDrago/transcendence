import { access } from 'node:fs/promises';
import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Headers,
	NotFoundException,
	Param,
	Patch,
	Post,
	Delete,
	Res,
	UploadedFile,
	UseInterceptors,
	HttpCode,
	HttpStatus,
	ForbiddenException,
	ParseUUIDPipe,
	Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { isUUID } from 'class-validator';
import { UsersService } from './users.service';
import { BlockService } from './block.service';
import { FriendsService } from './friends.service';
import type { AvatarUploadFile } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import {
	AVATAR_FIELD_NAME,
	AVATAR_MAX_SIZE_BYTES,
	AVATAR_OUTPUT_MIME_TYPE,
	DEFAULT_AVATAR_ASSET_PATH,
	DEFAULT_AVATAR_FILENAME,
	DEFAULT_AVATAR_MIME_TYPE,
} from './avatar.constants';
import { getAvatarUploadPath, isSafeAvatarFilename } from './avatar.utils';

@Controller('users')
export class UsersController {
	constructor(
		private readonly usersService: UsersService,
		private readonly blockService: BlockService,
		private readonly friendsService: FriendsService,
	) { }

	private validateUserId(userId: string) {
		if (!userId || !isUUID(userId, '4')) {
			throw new BadRequestException('Invalid or missing x-user-id header');
		}
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	create(@Body() createUserDto: CreateUserDto) {
		return this.usersService.create(createUserDto);
	}

	@Get('me')
	findMe(@Headers('x-user-id') userId: string) {
		this.validateUserId(userId);
		return this.usersService.findOne(userId);
	}

	@Patch('me')
	updateMe(
		@Headers('x-user-id') userId: string,
		@Body() updateProfileDto: UpdateProfileDto,
	) {
		this.validateUserId(userId);
		return this.usersService.update(userId, updateProfileDto);
	}

	@Get('me/export')
	@Header('Content-Type', 'application/json')
	@Header('Content-Disposition', 'attachment; filename="transcendence-data-export.json"')
	async exportMyData(@Headers('x-user-id') userId: string) {
		this.validateUserId(userId);
		const profile = await this.usersService.findOne(userId);
		const friends = await this.friendsService.getFriends(userId);
		const blocked = await this.blockService.getBlockedUsers(userId);
		return {
			exportedAt: new Date().toISOString(),
			profile,
			friends,
			blocked,
		};
	}

	@Post('me/import')
	async importMyData(
		@Headers('x-user-id') userId: string,
		@Body() data: any,
	) {
		this.validateUserId(userId);
		return this.usersService.importData(userId, data);
	}

	@Patch(':id/username')
	updateUsername(
		@Headers('x-user-id') requesterId: string,
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() updateUsernameDto: UpdateUsernameDto,
	) {
		this.validateUserId(requesterId);
		if (requesterId !== id) {
			throw new ForbiddenException('You can only update your own username');
		}
		return this.usersService.updateUsername(id, updateUsernameDto.username);
	}

	@Patch('me/avatar')
	@UseInterceptors(
		FileInterceptor(AVATAR_FIELD_NAME, {
			limits: {
				fileSize: AVATAR_MAX_SIZE_BYTES,
				files: 1,
			},
		}),
	)
	updateMyAvatar(
		@Headers('x-user-id') userId: string,
		@UploadedFile() file?: AvatarUploadFile,
	) {
		this.validateUserId(userId);
		return this.usersService.updateAvatar(userId, file);
	}

	@Get('avatars/:filename')
	async getAvatar(
		@Param('filename') filename: string,
		@Res() response: Response,
	) {
		if (!isSafeAvatarFilename(filename)) {
			throw new NotFoundException('Avatar not found');
		}

		const isDefaultAvatar = filename === DEFAULT_AVATAR_FILENAME;
		const filePath = isDefaultAvatar
			? DEFAULT_AVATAR_ASSET_PATH
			: getAvatarUploadPath(filename);

		try {
			await access(filePath);
		} catch {
			throw new NotFoundException('Avatar not found');
		}

		response.setHeader(
			'Content-Type',
			isDefaultAvatar ? DEFAULT_AVATAR_MIME_TYPE : AVATAR_OUTPUT_MIME_TYPE,
		);
		response.setHeader('X-Content-Type-Options', 'nosniff');
		if (isDefaultAvatar) {
			response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
		} else {
			response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
		}

		return new Promise<void>((resolve, reject) => {
			response.sendFile(filePath, (err) => err ? reject(err) : resolve());
		});
	}

	@Get(':id')
	async findOne(
		@Headers('x-user-id') requesterId: string,
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
	) {
		this.validateUserId(requesterId);
		const blockStatus = await this.blockService.getBlockStatus(requesterId, id);
		if (blockStatus.isBlocked) {
			throw new NotFoundException('User not found');
		}
		return this.usersService.findOne(id);
	}

	@Delete('me')
	@HttpCode(HttpStatus.NO_CONTENT)
	async removeMe(@Headers('x-user-id') requesterId: string): Promise<void> {
		this.validateUserId(requesterId);
		await this.usersService.remove(requesterId);
		return;
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async remove(
		@Headers('x-user-id') requesterId: string,
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
	): Promise<void> {
		this.validateUserId(requesterId);
		if (requesterId !== id) {
			throw new ForbiddenException('You can only delete your own profile');
		}
		await this.usersService.remove(id);
		return;
	}
}
