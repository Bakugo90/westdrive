import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleOperationalStatus } from '../entities/vehicle.entity';

class CreateVehicleImageDto {
  @ApiProperty({
    example: 'https://cdn.westdrive.fr/vehicles/model-x/front.jpg',
  })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateVehicleDto {
  @ApiProperty({ example: 'Tesla Model X 2024' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Tesla' })
  @IsString()
  brand!: string;

  @ApiProperty({ example: 'Model X' })
  @IsString()
  model!: string;

  @ApiProperty({ example: 2024 })
  @IsInt()
  year!: number;

  @ApiProperty({ example: 'SUV' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'AUTOMATIQUE' })
  @IsString()
  transmission!: string;

  @ApiProperty({ example: 'ELECTRIQUE' })
  @IsString()
  energy!: string;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  seats!: number;

  @ApiProperty({ example: 200 })
  @IsInt()
  @Min(0)
  includedKmPerDay!: number;

  @ApiProperty({ example: 159.99 })
  @IsNumber()
  @Min(0)
  pricePerDay!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 4.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewCount?: number;

  @ApiPropertyOptional({ enum: VehicleOperationalStatus })
  @IsOptional()
  @IsEnum(VehicleOperationalStatus)
  operationalStatus?: VehicleOperationalStatus;

  @ApiPropertyOptional({ type: [String], example: ['Paris', 'Nanterre'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableCities?: string[];

  @ApiProperty({ example: '12 Rue de Rivoli' })
  @IsString()
  streetAddress!: string;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 48.856614 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 2.3522219 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ type: [CreateVehicleImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVehicleImageDto)
  images?: CreateVehicleImageDto[];
}
