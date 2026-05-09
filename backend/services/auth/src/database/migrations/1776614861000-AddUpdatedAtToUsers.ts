import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedAtToUsers1776614861000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        DROP COLUMN "updatedAt"
    `);
  }
}
