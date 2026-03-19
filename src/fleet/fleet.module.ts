import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../iam/guards/permissions.guard';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { FleetIncident } from './entities/fleet-incident.entity';
import { VehicleScheduleSlot } from './entities/vehicle-schedule-slot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, FleetIncident, VehicleScheduleSlot]),
  ],
  controllers: [FleetController],
  providers: [FleetService, PermissionsGuard],
  exports: [FleetService],
})
export class FleetModule {}
