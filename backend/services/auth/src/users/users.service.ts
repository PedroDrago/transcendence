import { Injectable } from '@nestjs/common';

export type User = {
    id: number;
    username: string;
    password: string;
};

@Injectable()
export class UsersService {
}
