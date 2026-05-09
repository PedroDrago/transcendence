import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthColumns1776200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "auth"."oauth_provider_enum" AS ENUM ('local', 'google', '42')
    `);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ALTER COLUMN "passwordHash" DROP NOT NULL,
        ALTER COLUMN "username" TYPE VARCHAR(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ADD COLUMN "email" VARCHAR(255),
        ADD COLUMN "oauthProvider" "auth"."oauth_provider_enum" NOT NULL DEFAULT 'local',
        ADD COLUMN "oauthId" VARCHAR(255)
    `);
    await queryRunner.query(`
      UPDATE "auth"."users"
      SET "email" = "username" || '@legacy.local'
      WHERE "email" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ALTER COLUMN "email" SET NOT NULL,
        ADD CONSTRAINT "UQ_users_email" UNIQUE ("email")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_oauth_provider_oauth_id"
      ON "auth"."users" ("oauthProvider", "oauthId")
      WHERE "oauthId" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "auth"."IDX_users_oauth_provider_oauth_id"`);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        DROP COLUMN "oauthId",
        DROP COLUMN "oauthProvider",
        DROP COLUMN "email"
    `);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ALTER COLUMN "passwordHash" SET NOT NULL,
        ALTER COLUMN "username" TYPE VARCHAR(20)
    `);
    await queryRunner.query(`DROP TYPE "auth"."oauth_provider_enum"`);
  }
}
