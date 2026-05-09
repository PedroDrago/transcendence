import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfilesTable1777406012983 implements MigrationInterface {
    name = 'CreateProfilesTable1777406012983'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_management"."profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "displayName" character varying, "bio" text, "dateOfBirth" date, "avatarUrl" character varying NOT NULL DEFAULT 'default-avatar.png', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d1ea35db5be7c08520d70dc03f8" UNIQUE ("username"), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user_management"."profiles"`);
    }

}
