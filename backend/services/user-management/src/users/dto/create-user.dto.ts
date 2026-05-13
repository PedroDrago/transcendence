import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
	@IsUUID()
	@IsNotEmpty()
	id: string;

	@IsString()
	@IsNotEmpty()
	username: string;
}
