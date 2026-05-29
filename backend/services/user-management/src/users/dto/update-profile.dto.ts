import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
	@IsString()
	@IsOptional()
	@MaxLength(100)
	displayName?: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	bio?: string;

	@Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be in YYYY-MM-DD format' })
	@IsOptional()
	dateOfBirth?: string;
}
