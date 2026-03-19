import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReservationsPhase41773963000000 implements MigrationInterface {
  name = 'ReservationsPhase41773963000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_status_enum" AS ENUM('NOUVELLE_DEMANDE', 'EN_ANALYSE', 'PROPOSITION_ENVOYEE', 'EN_ATTENTE_PAIEMENT', 'CONFIRMEE', 'EN_COURS', 'CLOTUREE', 'ANNULEE', 'REFUSEE')`,
    );

    await queryRunner.query(
      `CREATE TABLE "reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "vehicle_id" uuid,
        "requester_type" character varying NOT NULL,
        "requester_name" character varying NOT NULL,
        "requester_email" character varying NOT NULL,
        "requester_phone" character varying NOT NULL,
        "company_name" character varying,
        "company_siret" character varying,
        "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "pickup_city" character varying NOT NULL,
        "requested_vehicle_type" character varying NOT NULL,
        "public_reference" character varying NOT NULL,
        "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'NOUVELLE_DEMANDE',
        "amount_ttc" numeric(10,2) NOT NULL DEFAULT '0',
        "deposit_amount" numeric(10,2) NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_reservations_public_reference" UNIQUE ("public_reference"),
        CONSTRAINT "PK_reservations_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "reservation_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reservation_id" uuid NOT NULL,
        "type" character varying NOT NULL,
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reservation_events_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_vehicle_id" ON "reservations" ("vehicle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_status" ON "reservations" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_start_end" ON "reservations" ("start_at", "end_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservation_events_reservation_id" ON "reservation_events" ("reservation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reservation_events_occurred_at" ON "reservation_events" ("occurred_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_reservations_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_reservations_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_events" ADD CONSTRAINT "FK_reservation_events_reservation_id" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reservation_events" DROP CONSTRAINT "FK_reservation_events_reservation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservations_vehicle_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservations_user_id"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservation_events_occurred_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservation_events_reservation_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_reservations_start_end"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reservations_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reservations_vehicle_id"`,
    );

    await queryRunner.query(`DROP TABLE "reservation_events"`);
    await queryRunner.query(`DROP TABLE "reservations"`);

    await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
  }
}
