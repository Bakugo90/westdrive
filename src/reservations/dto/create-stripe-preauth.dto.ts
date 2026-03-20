import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateStripePreauthDto {
  @ApiPropertyOptional({
    description: 'Montant de preautorisation (franchise ou acompte)',
    example: 1200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
