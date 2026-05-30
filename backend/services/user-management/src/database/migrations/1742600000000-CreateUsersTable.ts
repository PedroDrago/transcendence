import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1742600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // No-op to avoid leaving orphaned 'public.users' table
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
