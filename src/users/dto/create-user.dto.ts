import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'agent.operations@westdrive.fr' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SuperSecurePassword123!', minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty({ example: 'Lina' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Khan' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '+33622334455' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'CUSTOMER' })
  @IsString()
  role!: string;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIF })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
