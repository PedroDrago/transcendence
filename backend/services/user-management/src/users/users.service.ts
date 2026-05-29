import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    PayloadTooLargeException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
    AVATAR_IMAGE_SIZE_PIXELS,
    AVATAR_LEGACY_EXTENSIONS,
    AVATAR_UPLOAD_DIRECTORY,
    DEFAULT_AVATAR_FILENAME,
    DEFAULT_AVATAR_PUBLIC_PATH,
} from './avatar.constants';
import {
    getAvatarFilename,
    getAvatarPublicPath,
    getAvatarUploadPath,
    getValidatedAvatarImage,
    isAvatarFileSizeAllowed,
} from './avatar.utils';

export type AvatarUploadFile = {
    buffer?: Buffer;
    mimetype?: string;
    size?: number;
};

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(createUserDto: CreateUserDto) {
        try {
            const user = this.usersRepository.create({
                id: createUserDto.id,
                username: createUserDto.username,
            });
            await this.usersRepository.insert(user);
            return this.serializeProfile(user);
        } catch (error) {
            if ((error as any).code === '23505') {
                throw new ConflictException('User or username already exists');
            }
            throw error;
        }
    }

    async findOne(id: string) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return this.serializeProfile(user);
    }

    async update(id: string, updateProfileDto: UpdateProfileDto) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if ('displayName' in updateProfileDto) {
            user.displayName = (updateProfileDto.displayName ?? null) as any;
        }
        if ('bio' in updateProfileDto) {
            user.bio = (updateProfileDto.bio ?? null) as any;
        }
        if (updateProfileDto.dateOfBirth) {
            if (new Date(updateProfileDto.dateOfBirth) > new Date()) {
                throw new BadRequestException('Date of birth cannot be in the future');
            }
            user.dateOfBirth = updateProfileDto.dateOfBirth;
        }

        await this.usersRepository.save(user);
        return this.serializeProfile(user);
    }

    async remove(id: string) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.avatarUrl && !user.avatarUrl.includes(DEFAULT_AVATAR_FILENAME)) {
            try {
                const filename = user.avatarUrl.split('/').pop();
                if (filename) await unlink(getAvatarUploadPath(filename));
            } catch (error) {
                this.logger.error(`Failed to remove avatar from user ${id}: ${(error as Error).message}`,);
            }
        }

        await this.usersRepository.delete(id);
    }

    async updateAvatar(id: string, file: AvatarUploadFile | undefined) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!file?.buffer || !file.mimetype || typeof file.size !== 'number') {
            throw new BadRequestException('Missing avatar file');
        }

        if (!isAvatarFileSizeAllowed(file.size)) {
            throw new PayloadTooLargeException('Avatar must be 2MB or smaller');
        }

        if (!getValidatedAvatarImage(file.mimetype, file.buffer)) {
            throw new UnsupportedMediaTypeException('Avatar must be a JPEG, PNG, or WebP image',);
        }

        const avatarFilename = getAvatarFilename(user.id);
        const avatarPath = getAvatarUploadPath(avatarFilename);
        const temporaryAvatarPath = `${avatarPath}.tmp`;

        let processedAvatar: Buffer;
        try {
            processedAvatar = await sharp(file.buffer)
                .rotate()
                .resize(AVATAR_IMAGE_SIZE_PIXELS, AVATAR_IMAGE_SIZE_PIXELS, {fit: 'cover',})
                .webp({ quality: 82 })
                .toBuffer();
        } catch {
            throw new UnsupportedMediaTypeException('Avatar image could not be processed',);
        }

        await mkdir(AVATAR_UPLOAD_DIRECTORY, { recursive: true });

        try {
            await writeFile(temporaryAvatarPath, processedAvatar);
            await rename(temporaryAvatarPath, avatarPath);
            await this.removeLegacyAvatarFiles(user.id);

            user.avatarUrl = getAvatarPublicPath(avatarFilename);
            await this.usersRepository.save(user);
        } catch (error) {
            await unlink(temporaryAvatarPath).catch(() => {});
            throw error;
        }

        return this.serializeProfile(user);
    }

    public serializeProfile(user: User) {
        if (!user) {
            throw new NotFoundException('User not found');
        }
        let age: number | null = null;
        if (user.dateOfBirth) {
            const today = new Date();
            const dob = new Date(user.dateOfBirth);
            age = today.getUTCFullYear() - dob.getUTCFullYear();
            const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
                age--;
            }
        }

        const { dateOfBirth, ...userWithoutDob } = user;
        return {
            ...userWithoutDob,
            avatarUrl: this.normalizeAvatarUrl(user.avatarUrl),
            age,
        };
    }

    private normalizeAvatarUrl(avatarUrl?: string | null): string {
        if (!avatarUrl || avatarUrl === DEFAULT_AVATAR_FILENAME) {
            return DEFAULT_AVATAR_PUBLIC_PATH;
        }
        return avatarUrl;
    }

    private async removeLegacyAvatarFiles(userId: string): Promise<void> {
        await Promise.all(
            AVATAR_LEGACY_EXTENSIONS.map(async (extension) => {
                try {
                    await unlink(getAvatarUploadPath(`${userId}.${extension}`));
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                        throw error;
                    }
                }
            }),
        );
    }
}
