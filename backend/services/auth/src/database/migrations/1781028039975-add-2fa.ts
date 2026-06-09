import { MigrationInterface, QueryRunner } from "typeorm";

export class Add2fa1781028039975 implements MigrationInterface {
    name = 'Add2fa1781028039975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "auth"."IDX_users_oauth_provider_oauth_id"`);
        await queryRunner.query(`ALTER TYPE "auth"."oauth_provider_enum" RENAME TO "oauth_provider_enum_old"`);
        await queryRunner.query(`CREATE TYPE "auth"."users_oauthprovider_enum" AS ENUM('local', 'google', '42')`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ALTER COLUMN "oauthProvider" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ALTER COLUMN "oauthProvider" TYPE "auth"."users_oauthprovider_enum" USING "oauthProvider"::"text"::"auth"."users_oauthprovider_enum"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ALTER COLUMN "oauthProvider" SET DEFAULT 'local'`);
        await queryRunner.query(`DROP TYPE "auth"."oauth_provider_enum_old"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "auth"."users" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."users" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "auth"."users" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE TYPE "auth"."oauth_provider_enum_old" AS ENUM('local', 'google', '42')`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ALTER COLUMN "oauthProvider" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ALTER COLUMN "oauthProvider" TYPE "auth"."oauth_provider_enum_old" USING "oauthProvider"::"text"::"auth"."oauth_provider_enum_old"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ALTER COLUMN "oauthProvider" SET DEFAULT 'local'`);
        await queryRunner.query(`DROP TYPE "auth"."users_oauthprovider_enum"`);
        await queryRunner.query(`ALTER TYPE "auth"."oauth_provider_enum_old" RENAME TO "oauth_provider_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_oauth_provider_oauth_id" ON "auth"."users" ("oauthProvider", "oauthId") WHERE ("oauthId" IS NOT NULL)`);
    }

}
