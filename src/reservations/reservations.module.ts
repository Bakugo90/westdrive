import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleScheduleSlot } from '../fleet/entities/vehicle-schedule-slot.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { ReservationEvent } from './entities/reservation-event.entity';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      ReservationEvent,
      Vehicle,
      VehicleScheduleSlot,
    ]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
