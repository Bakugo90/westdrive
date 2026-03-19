import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import {
  FleetIncidentSeverity,
  FleetIncidentStatus,
  FleetIncidentType,
} from '../entities/fleet-incident.entity';

export class CreateFleetIncidentDto {
  @ApiProperty({
    description: 'UUID du vehicule concerne',
    example: '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
  })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ enum: FleetIncidentType, example: FleetIncidentType.PANNE })
  @IsEnum(FleetIncidentType)
  incidentType!: FleetIncidentType;

  @ApiProperty({
    enum: FleetIncidentSeverity,
    example: FleetIncidentSeverity.MAJEUR,
  })
  @IsEnum(FleetIncidentSeverity)
  severity!: FleetIncidentSeverity;

  @ApiPropertyOptional({
    enum: FleetIncidentStatus,
    example: FleetIncidentStatus.OUVERT,
  })
  @IsOptional()
  @IsEnum(FleetIncidentStatus)
  status?: FleetIncidentStatus;

  @ApiProperty({
    description: 'Description operationnelle de l incident',
    example: 'Perte de puissance moteur constatee pendant une location.',
  })
  @IsString()
  @MinLength(5)
  description!: string;

  @ApiPropertyOptional({
    description: 'Date d ouverture de l incident',
    example: '2026-03-20T10:15:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  openedAt?: Date;

  @ApiPropertyOptional({
    description: 'Date de resolution si deja connu',
    example: '2026-03-21T16:40:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  resolvedAt?: Date;
}
