import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { User } from './users/user.entity';
import { CreateUsersTable1742600000000 } from './database/migrations/1742600000000-CreateUsersTable';
import { AddOAuthColumns1776200000000 } from './database/migrations/1776200000000-AddOAuthColumns';

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
        migrations: [CreateUsersTable1742600000000, AddOAuthColumns1776200000000],
        migrationsRun: true,
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
