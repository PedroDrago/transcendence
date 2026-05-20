import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFriendshipsTable1777408000000 implements MigrationInterface {
    name = 'CreateFriendshipsTable1777408000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_management"."friendships" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "requesterId" uuid NOT NULL,
                "addresseeId" uuid NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'PENDING',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_friendships_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "user_management"."friendships"
            ADD CONSTRAINT "FK_friendships_requester" FOREIGN KEY ("requesterId") REFERENCES "user_management"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "user_management"."friendships"
            ADD CONSTRAINT "FK_friendships_addressee" FOREIGN KEY ("addresseeId") REFERENCES "user_management"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" DROP CONSTRAINT "FK_friendships_addressee"`);
        await queryRunner.query(`ALTER TABLE "user_management"."friendships" DROP CONSTRAINT "FK_friendships_requester"`);
        await queryRunner.query(`DROP TABLE "user_management"."friendships"`);
    }
}
