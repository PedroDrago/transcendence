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
        // Blindagem contra duplicidade (Internal communication safety)
        const existing = await this.usersRepository.findOne({ where: { id: createUserDto.id } });
        if (existing) {
            throw new ConflictException('User already exists');
        }

        const user = this.usersRepository.create({
            id: createUserDto.id,
            username: createUserDto.username,
        });
        await this.usersRepository.save(user);
        return this.serializeProfile(user);
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

        Object.assign(user, updateProfileDto);
        await this.usersRepository.save(user);
        return this.serializeProfile(user);
    }

    async remove(id: string) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Limpeza física: se o usuário tinha um avatar custom, apaga do disco
        if (user.avatarUrl && !user.avatarUrl.includes(DEFAULT_AVATAR_FILENAME)) {
            try {
                const filename = user.avatarUrl.split('/').pop();
                if (filename) await unlink(getAvatarUploadPath(filename));
            } catch (error) {
                this.logger.error(`Falha ao remover avatar de ${id}: ${(error as Error).message}`);
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
            throw new UnsupportedMediaTypeException('Avatar must be a JPEG, PNG, or WebP image');
        }

        const avatarFilename = getAvatarFilename(user.id);
        const avatarPath = getAvatarUploadPath(avatarFilename);
        const temporaryAvatarPath = `${avatarPath}.tmp`;

        let processedAvatar: Buffer;
        try {
            processedAvatar = await sharp(file.buffer)
                .rotate()
                .resize(AVATAR_IMAGE_SIZE_PIXELS, AVATAR_IMAGE_SIZE_PIXELS, { fit: 'cover' })
                .webp({ quality: 82 })
                .toBuffer();
        } catch {
            throw new UnsupportedMediaTypeException('Avatar image could not be processed');
        }

        await mkdir(AVATAR_UPLOAD_DIRECTORY, { recursive: true });
        await writeFile(temporaryAvatarPath, processedAvatar);
        await rename(temporaryAvatarPath, avatarPath);
        await this.removeLegacyAvatarFiles(user.id);

        user.avatarUrl = getAvatarPublicPath(avatarFilename);
        await this.usersRepository.save(user);

        return this.serializeProfile(user);
    }

    private serializeProfile(user: User) {
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
