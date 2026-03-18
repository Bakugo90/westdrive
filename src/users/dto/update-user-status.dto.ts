import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Nouveau statut utilisateur',
    enum: UserStatus,
    example: UserStatus.SUSPENDU,
  })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
