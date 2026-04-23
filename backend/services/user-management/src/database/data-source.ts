import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CreateUsersTable1742600000000 } from './migrations/1742600000000-CreateUsersTable';
import { User } from '../users/entities/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'transcendence',
  entities: [User],
  migrations: [CreateUsersTable1742600000000],
});
