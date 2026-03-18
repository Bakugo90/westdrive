import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1773848509443 implements MigrationInterface {
  name = 'AutoMigration1773848509443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIF', 'SUSPENDU')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "phone" character varying NOT NULL, "role" character varying NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIF', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
  }
}
