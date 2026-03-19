import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { VehicleOperationalStatus } from '../../vehicles/entities/vehicle.entity';

export class UpdateFleetVehicleStatusDto {
  @ApiProperty({
    enum: VehicleOperationalStatus,
    example: VehicleOperationalStatus.INDISPONIBLE,
  })
  @IsEnum(VehicleOperationalStatus)
  operationalStatus!: VehicleOperationalStatus;
}
