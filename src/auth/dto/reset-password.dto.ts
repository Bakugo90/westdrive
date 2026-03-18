import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email du compte',
    example: 'client@westdrive.fr',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Code OTP a 6 chiffres',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  otp!: string;

  @ApiProperty({
    description: 'Nouveau mot de passe',
    example: 'NouveauMotDePasseTresFort123!',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  newPassword!: string;
}
