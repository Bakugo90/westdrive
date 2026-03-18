import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email du compte',
    example: 'admin@westdrive.fr',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Mot de passe du compte',
    example: 'ChangeMeStrongPassword',
  })
  @IsString()
  password!: string;
}
