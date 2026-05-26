import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlocksTable1780000000000 implements MigrationInterface {
    name = 'CreateBlocksTable1780000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_management"."blocks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "blockerId" uuid NOT NULL,
                "blockedId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_blocks_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "user_management"."blocks"
            ADD CONSTRAINT "FK_blocks_blocker" FOREIGN KEY ("blockerId") REFERENCES "user_management"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "user_management"."blocks"
            ADD CONSTRAINT "FK_blocks_blocked" FOREIGN KEY ("blockedId") REFERENCES "user_management"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        -- Directional unique index: (blockerId, blockedId) — A blocks B is independent of B blocks A
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_blocks_blocker_blocked" ON "user_management"."blocks" ("blockerId", "blockedId")
        `);

        -- CHECK constraint to prevent self-blocking at the DB level
        await queryRunner.query(`
            ALTER TABLE "user_management"."blocks"
            ADD CONSTRAINT "CHK_blocks_no_self" CHECK ("blockerId" <> "blockedId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_management"."blocks" DROP CONSTRAINT "CHK_blocks_no_self"`);
        await queryRunner.query(`DROP INDEX "user_management"."IDX_blocks_blocker_blocked"`);
        await queryRunner.query(`ALTER TABLE "user_management"."blocks" DROP CONSTRAINT "FK_blocks_blocked"`);
        await queryRunner.query(`ALTER TABLE "user_management"."blocks" DROP CONSTRAINT "FK_blocks_blocker"`);
        await queryRunner.query(`DROP TABLE "user_management"."blocks"`);
    }
}
