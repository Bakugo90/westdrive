import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiPropertyOptional({
    description: 'UUID utilisateur si la reservation est liee a un compte',
    example: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'UUID vehicule cible (necessaire pour anti double-booking)',
    example: '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
  })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({ example: 'PARTICULIER' })
  @IsString()
  requesterType!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  requesterName!: string;

  @ApiProperty({ example: 'john.doe@email.com' })
  @IsEmail()
  requesterEmail!: string;

  @ApiProperty({ example: '+33612345678' })
  @IsString()
  requesterPhone!: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @IsString()
  companySiret?: string;

  @ApiProperty({ example: '2026-04-20T08:00:00Z' })
  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @ApiProperty({ example: '2026-04-22T18:00:00Z' })
  @Type(() => Date)
  @IsDate()
  endAt!: Date;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  pickupCity!: string;

  @ApiProperty({ example: 'SUV' })
  @IsString()
  requestedVehicleType!: string;

  @ApiPropertyOptional({ example: 499.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountTtc?: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;
}
