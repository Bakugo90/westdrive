import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, IsUUID } from 'class-validator';

export class CreateVehicleScheduleSlotDto {
  @ApiProperty({
    description: 'UUID du vehicule',
    example: '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
  })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ example: '2026-04-01T08:00:00Z' })
  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @ApiProperty({ example: '2026-04-01T12:00:00Z' })
  @Type(() => Date)
  @IsDate()
  endAt!: Date;

  @ApiProperty({ example: 'MAINTENANCE' })
  @IsString()
  slotType!: string;
}
