import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyProfilePhase4b1773969000000 implements MigrationInterface {
  name = 'CompanyProfilePhase4b1773969000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company_name" character varying NOT NULL,
        "siret" character varying NOT NULL,
        "contact_name" character varying NOT NULL,
        "contact_email" character varying NOT NULL,
        "contact_phone" character varying NOT NULL,
        CONSTRAINT "UQ_company_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_company_profiles_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "company_profiles" ADD CONSTRAINT "FK_company_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_profiles" DROP CONSTRAINT "FK_company_profiles_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "company_profiles"`);
  }
}
