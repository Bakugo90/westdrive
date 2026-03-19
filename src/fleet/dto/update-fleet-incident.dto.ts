import { PartialType } from '@nestjs/swagger';
import { CreateFleetIncidentDto } from './create-fleet-incident.dto';

export class UpdateFleetIncidentDto extends PartialType(
  CreateFleetIncidentDto,
) {}
