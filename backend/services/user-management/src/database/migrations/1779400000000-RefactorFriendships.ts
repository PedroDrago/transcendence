import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorFriendships1779400000000 implements MigrationInterface {
    name = 'RefactorFriendships1779400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Change status to strict enum
        await queryRunner.query(`CREATE TYPE "user_management"."friendships_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" ALTER COLUMN "status" TYPE "user_management"."friendships_status_enum" USING "status"::"text"::"user_management"."friendships_status_enum"`);
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);

        // Add unique index to prevent duplicate relationships regardless of direction
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_friendships_users" ON "user_management"."friendships" (LEAST("requesterId"::text, "addresseeId"::text), GREATEST("requesterId"::text, "addresseeId"::text))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove unique index
        await queryRunner.query(`DROP INDEX "user_management"."IDX_friendships_users"`);

        // Revert enum back to varchar
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" ALTER COLUMN "status" TYPE character varying(20) USING "status"::"text"`);
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "user_management"."friendships_status_enum"`);
    }
}
