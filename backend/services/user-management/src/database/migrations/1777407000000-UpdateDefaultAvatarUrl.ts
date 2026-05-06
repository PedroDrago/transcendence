import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDefaultAvatarUrl1777407000000 implements MigrationInterface {
  name = 'UpdateDefaultAvatarUrl1777407000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_management"."profiles"
      ALTER COLUMN "avatarUrl"
      SET DEFAULT '/users/avatars/default-avatar.png'
    `);
    await queryRunner.query(`
      UPDATE "user_management"."profiles"
      SET "avatarUrl" = '/users/avatars/default-avatar.png'
      WHERE "avatarUrl" IS NULL
        OR "avatarUrl" = ''
        OR "avatarUrl" = 'default-avatar.png'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user_management"."profiles"
      SET "avatarUrl" = 'default-avatar.png'
      WHERE "avatarUrl" = '/users/avatars/default-avatar.png'
    `);
    await queryRunner.query(`
      ALTER TABLE "user_management"."profiles"
      ALTER COLUMN "avatarUrl"
      SET DEFAULT 'default-avatar.png'
    `);
  }
}
