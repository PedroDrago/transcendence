import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../users/entities/user.entity';
import { Friendship } from '../users/entities/friendship.entity';
import { Block } from '../users/entities/block.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'transcendence',
  schema: 'user_management',
  entities: [User, Friendship, Block],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
