import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email du compte a reinitialiser',
    example: 'client@westdrive.fr',
  })
  @IsEmail()
  email!: string;
}
