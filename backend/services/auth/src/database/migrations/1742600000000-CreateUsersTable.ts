import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1742600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await queryRunner.query(`
      CREATE TABLE "auth"."users" (
        "id"           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "username"     VARCHAR(20)   NOT NULL UNIQUE,
        "passwordHash" VARCHAR(255)  NOT NULL,
        "createdAt"    TIMESTAMPTZ   NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth"."users"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS auth`);
  }
}
