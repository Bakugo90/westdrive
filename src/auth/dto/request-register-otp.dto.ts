import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestRegisterOtpDto {
  @ApiPropertyOptional({
    description: 'Type de compte (PARTICULIER ou ENTREPRISE)',
    example: 'PARTICULIER',
  })
  @IsOptional()
  @IsIn(['PARTICULIER', 'ENTREPRISE'])
  accountType?: 'PARTICULIER' | 'ENTREPRISE';

  @ApiProperty({
    description: 'Email du nouveau compte',
    example: 'client@westdrive.fr',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Mot de passe du compte (minimum 12 caracteres)',
    example: 'MonMotDePasseTresFort123!',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty({
    description: 'Prenom utilisateur',
    example: 'Sami',
  })
  @IsString()
  firstName!: string;

  @ApiProperty({
    description: 'Nom utilisateur',
    example: 'Diallo',
  })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Numero de telephone',
    example: '+33612345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'WestDrive SAS' })
  @ValidateIf((dto: RequestRegisterOtpDto) => dto.accountType === 'ENTREPRISE')
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: '12345678901234' })
  @ValidateIf((dto: RequestRegisterOtpDto) => dto.accountType === 'ENTREPRISE')
  @IsString()
  siret?: string;

  @ApiPropertyOptional({ example: 'Amine Diallo' })
  @ValidateIf((dto: RequestRegisterOtpDto) => dto.accountType === 'ENTREPRISE')
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: 'contact@entreprise.fr' })
  @ValidateIf((dto: RequestRegisterOtpDto) => dto.accountType === 'ENTREPRISE')
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+33699998888' })
  @ValidateIf((dto: RequestRegisterOtpDto) => dto.accountType === 'ENTREPRISE')
  @IsString()
  contactPhone?: string;
}
