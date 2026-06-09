import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTwoFactorColumns1781035465357 implements MigrationInterface {
    name = 'AddTwoFactorColumns1781035465357'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."users" ADD "isTwoFactorEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "auth"."users" ADD "twoFactorSecret" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth"."users" DROP COLUMN "twoFactorSecret"`);
        await queryRunner.query(`ALTER TABLE "auth"."users" DROP COLUMN "isTwoFactorEnabled"`);
    }

}
