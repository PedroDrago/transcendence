import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernamePendingToUsers1776616088000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ADD COLUMN "usernamePending" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        DROP COLUMN "usernamePending"
    `);
  }
}
