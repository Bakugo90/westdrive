import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateReservationEventDto {
  @ApiProperty({ example: 'reservation_vehicle_handover' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ example: '2026-04-20T08:30:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @ApiPropertyOptional({
    example: { actor: 'agent_123', notes: 'Vehicule remis sans reserve' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
