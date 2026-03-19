import { MigrationInterface, QueryRunner } from 'typeorm';

export class VehiclesPhase21773951000000 implements MigrationInterface {
  name = 'VehiclesPhase21773951000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."vehicles_operational_status_enum" AS ENUM('DISPONIBLE', 'INDISPONIBLE', 'MAINTENANCE')`,
    );

    await queryRunner.query(
      `CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "brand" character varying NOT NULL,
        "model" character varying NOT NULL,
        "year" integer NOT NULL,
        "category" character varying NOT NULL,
        "transmission" character varying NOT NULL,
        "energy" character varying NOT NULL,
        "seats" integer NOT NULL,
        "included_km_per_day" integer NOT NULL,
        "price_per_day" numeric(10,2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "rating" numeric(3,2) NOT NULL DEFAULT 0,
        "review_count" integer NOT NULL DEFAULT 0,
        "operational_status" "public"."vehicles_operational_status_enum" NOT NULL DEFAULT 'DISPONIBLE',
        "available_cities" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "street_address" character varying NOT NULL,
        "city" character varying NOT NULL,
        "latitude" numeric(10,7) NOT NULL,
        "longitude" numeric(10,7) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicles_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "vehicle_images" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "url" character varying NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "vehicle_id" uuid NOT NULL,
        CONSTRAINT "PK_vehicle_images_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_vehicles_operational_status" ON "vehicles" ("operational_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicles_city" ON "vehicles" ("city")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_images_vehicle_id" ON "vehicle_images" ("vehicle_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "vehicle_images" ADD CONSTRAINT "FK_vehicle_images_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_images" DROP CONSTRAINT "FK_vehicle_images_vehicle_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vehicle_images_vehicle_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_vehicles_city"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vehicles_operational_status"`,
    );
    await queryRunner.query(`DROP TABLE "vehicle_images"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(
      `DROP TYPE "public"."vehicles_operational_status_enum"`,
    );
  }
}
