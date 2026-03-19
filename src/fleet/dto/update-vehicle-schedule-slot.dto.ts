import { PartialType } from '@nestjs/swagger';
import { CreateVehicleScheduleSlotDto } from './create-vehicle-schedule-slot.dto';

export class UpdateVehicleScheduleSlotDto extends PartialType(
  CreateVehicleScheduleSlotDto,
) {}
