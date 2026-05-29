import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class UpdateProfileDto {
	@IsString()
	@IsOptional()
	@MaxLength(100)
	displayName?: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	bio?: string;

	@IsDateString({ strict: true }, { message: 'dateOfBirth must be a valid ISO8601 date string' })
	@IsOptional()
	dateOfBirth?: string;
}
