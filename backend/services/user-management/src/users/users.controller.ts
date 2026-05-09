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
	Res,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './users.service';
import type { AvatarUploadFile } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
		if (!userId) {
			throw new BadRequestException('Missing x-user-id header');
		}
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

		return response.sendFile(filePath);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.usersService.findOne(id);
	}
}
