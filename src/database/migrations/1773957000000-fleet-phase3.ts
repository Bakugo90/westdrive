import { MigrationInterface, QueryRunner } from 'typeorm';

export class FleetPhase31773957000000 implements MigrationInterface {
  name = 'FleetPhase31773957000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."fleet_incidents_incident_type_enum" AS ENUM('DOMMAGE', 'PANNE', 'HISTORIQUE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fleet_incidents_severity_enum" AS ENUM('MINEUR', 'MAJEUR', 'CRITIQUE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fleet_incidents_status_enum" AS ENUM('OUVERT', 'EN_COURS', 'RESOLU')`,
    );

    await queryRunner.query(
      `CREATE TABLE "fleet_incidents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "vehicle_id" uuid NOT NULL,
        "incident_type" "public"."fleet_incidents_incident_type_enum" NOT NULL,
        "severity" "public"."fleet_incidents_severity_enum" NOT NULL,
        "status" "public"."fleet_incidents_status_enum" NOT NULL DEFAULT 'OUVERT',
        "description" character varying NOT NULL,
        "opened_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fleet_incidents_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "vehicle_schedule_slots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "vehicle_id" uuid NOT NULL,
        "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "slot_type" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_schedule_slots_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_fleet_incidents_vehicle_id" ON "fleet_incidents" ("vehicle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fleet_incidents_status" ON "fleet_incidents" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_schedule_slots_vehicle_id" ON "vehicle_schedule_slots" ("vehicle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_schedule_slots_start_end" ON "vehicle_schedule_slots" ("start_at", "end_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "fleet_incidents" ADD CONSTRAINT "FK_fleet_incidents_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_schedule_slots" ADD CONSTRAINT "FK_vehicle_schedule_slots_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_schedule_slots" DROP CONSTRAINT "FK_vehicle_schedule_slots_vehicle_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fleet_incidents" DROP CONSTRAINT "FK_fleet_incidents_vehicle_id"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_vehicle_schedule_slots_start_end"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vehicle_schedule_slots_vehicle_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_fleet_incidents_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fleet_incidents_vehicle_id"`,
    );

    await queryRunner.query(`DROP TABLE "vehicle_schedule_slots"`);
    await queryRunner.query(`DROP TABLE "fleet_incidents"`);

    await queryRunner.query(`DROP TYPE "public"."fleet_incidents_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."fleet_incidents_severity_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."fleet_incidents_incident_type_enum"`,
    );
  }
}
