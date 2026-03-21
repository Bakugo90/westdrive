import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../iam/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../iam/guards/permissions.guard';
import { CreateFleetIncidentDto } from './dto/create-fleet-incident.dto';
import { CreateVehicleScheduleSlotDto } from './dto/create-vehicle-schedule-slot.dto';
import { UpdateFleetIncidentDto } from './dto/update-fleet-incident.dto';
import { UpdateFleetVehicleStatusDto } from './dto/update-fleet-vehicle-status.dto';
import { UpdateVehicleScheduleSlotDto } from './dto/update-vehicle-schedule-slot.dto';
import { FleetService } from './fleet.service';

@ApiTags('Fleet')
@ApiBearerAuth()
@Controller('fleet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('overview')
  @RequirePermissions('fleet.read')
  @ApiOperation({ summary: 'Recuperer les KPI principaux flotte' })
  @ApiOkResponse({ description: 'KPI flotte retournes.' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission fleet.read requise.' })
  getOverview() {
    return this.fleetService.getOverview();
  }

  @Get('vehicles')
  @RequirePermissions('fleet.read')
  @ApiOperation({ summary: 'Lister les vehicules de flotte' })
  @ApiOkResponse({ description: 'Vehicules de flotte retournes.' })
  listFleetVehicles(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.fleetService.listFleetVehicles(page, limit);
  }

  @Patch('vehicles/:vehicleId/status')
  @RequirePermissions('fleet.manage')
  @ApiOperation({
    summary: 'Mettre a jour le statut operationnel d un vehicule',
  })
  @ApiParam({ name: 'vehicleId', description: 'UUID du vehicule' })
  updateVehicleStatus(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Body() dto: UpdateFleetVehicleStatusDto,
  ) {
    return this.fleetService.updateVehicleStatus(vehicleId, dto);
  }

  @Post('incidents')
  @RequirePermissions('fleet.manage')
  @ApiOperation({ summary: 'Creer un incident flotte' })
  createIncident(@Body() dto: CreateFleetIncidentDto) {
    return this.fleetService.createIncident(dto);
  }

  @Get('incidents')
  @RequirePermissions('fleet.read')
  @ApiOperation({ summary: 'Lister les incidents flotte' })
  listIncidents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.fleetService.listIncidents(page, limit);
  }

  @Get('incidents/:incidentId')
  @RequirePermissions('fleet.read')
  @ApiOperation({ summary: 'Recuperer un incident flotte par id' })
  getIncidentById(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
  ) {
    return this.fleetService.getIncidentById(incidentId);
  }

  @Patch('incidents/:incidentId')
  @RequirePermissions('fleet.manage')
  @ApiOperation({ summary: 'Mettre a jour un incident flotte' })
  updateIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: UpdateFleetIncidentDto,
  ) {
    return this.fleetService.updateIncident(incidentId, dto);
  }

  @Delete('incidents/:incidentId')
  @RequirePermissions('fleet.manage')
  @ApiOperation({ summary: 'Supprimer un incident flotte' })
  removeIncident(@Param('incidentId', new ParseUUIDPipe()) incidentId: string) {
    return this.fleetService.removeIncident(incidentId);
  }

  @Post('schedule-slots')
  @RequirePermissions('fleet.manage')
  @ApiOperation({ summary: 'Creer un slot de planning vehicule' })
  createScheduleSlot(@Body() dto: CreateVehicleScheduleSlotDto) {
    return this.fleetService.createScheduleSlot(dto);
  }

  @Get('schedule-slots')
  @RequirePermissions('fleet.read')
  @ApiOperation({ summary: 'Lister les slots de planning vehicule' })
  @ApiQuery({ name: 'vehicleId', required: false, type: String })
  listScheduleSlots(
    @Query('vehicleId') vehicleId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.fleetService.listScheduleSlots(vehicleId, page, limit);
  }

  @Get('schedule-slots/:slotId')
  @RequirePermissions('fleet.read')
  @ApiOperation({ summary: 'Recuperer un slot de planning par id' })
  getScheduleSlotById(@Param('slotId', new ParseUUIDPipe()) slotId: string) {
    return this.fleetService.getScheduleSlotById(slotId);
  }

  @Patch('schedule-slots/:slotId')
  @RequirePermissions('fleet.manage')
  @ApiOperation({ summary: 'Mettre a jour un slot de planning' })
  updateScheduleSlot(
    @Param('slotId', new ParseUUIDPipe()) slotId: string,
    @Body() dto: UpdateVehicleScheduleSlotDto,
  ) {
    return this.fleetService.updateScheduleSlot(slotId, dto);
  }

  @Delete('schedule-slots/:slotId')
  @RequirePermissions('fleet.manage')
  @ApiOperation({ summary: 'Supprimer un slot de planning' })
  removeScheduleSlot(@Param('slotId', new ParseUUIDPipe()) slotId: string) {
    return this.fleetService.removeScheduleSlot(slotId);
  }
}
