import { IsString, IsOptional, MaxLength, IsDateString, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
	@ValidateIf((object, value) => value !== null)
	@IsString()
	@IsOptional()
	@MaxLength(100)
	displayName?: string | null;

	@ValidateIf((object, value) => value !== null)
	@IsString()
	@IsOptional()
	@MaxLength(500)
	bio?: string | null;

	@ValidateIf((object, value) => value !== null)
	@IsDateString({ strict: true }, { message: 'dateOfBirth must be a valid ISO8601 date string' })
	@IsOptional()
	dateOfBirth?: string | null;
}
