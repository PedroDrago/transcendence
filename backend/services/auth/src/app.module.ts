import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { User } from './users/user.entity';
import { CreateUsersTable1742600000000 } from './database/migrations/1742600000000-CreateUsersTable';
import { AddOAuthColumns1776200000000 } from './database/migrations/1776200000000-AddOAuthColumns';
import { AddUpdatedAtToUsers1776614861000 } from './database/migrations/1776614861000-AddUpdatedAtToUsers';
import { AddUsernamePendingToUsers1776616088000 } from './database/migrations/1776616088000-AddUsernamePendingToUsers';
import { Add2fa1781028039975 } from './database/migrations/1781028039975-add-2fa';
import { AddTwoFactorColumns1781035465357 } from './database/migrations/1781035465357-AddTwoFactorColumns';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [User],
        migrations: [
          CreateUsersTable1742600000000,
          AddOAuthColumns1776200000000,
          AddUpdatedAtToUsers1776614861000,
          AddUsernamePendingToUsers1776616088000,
          Add2fa1781028039975,
          AddTwoFactorColumns1781035465357,
        ],
        migrationsRun: true,
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
