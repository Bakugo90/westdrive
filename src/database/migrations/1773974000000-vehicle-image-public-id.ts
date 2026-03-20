import { MigrationInterface, QueryRunner } from 'typeorm';

export class VehicleImagePublicId1773974000000 implements MigrationInterface {
  name = 'VehicleImagePublicId1773974000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_images" ADD "public_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_images" DROP COLUMN "public_id"`,
    );
  }
}
