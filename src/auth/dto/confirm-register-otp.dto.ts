import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class ConfirmRegisterOtpDto {
  @ApiProperty({
    description: 'Email du compte en attente de validation',
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
}
