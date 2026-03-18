import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestRegisterOtpDto {
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
}
