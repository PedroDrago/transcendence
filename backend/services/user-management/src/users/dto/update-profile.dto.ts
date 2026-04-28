import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateProfileDto {
	@IsString()
	@IsOptional()
	displayName?: string;

	@IsString()
	@IsOptional()
	bio?: string;

	@IsDateString()
	@IsOptional()
	dateOfBirth?: string;
}
