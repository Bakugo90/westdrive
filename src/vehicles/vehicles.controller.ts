import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @RequirePermissions('vehicles.write')
  @ApiOperation({ summary: 'Creer un vehicule' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.write requise.' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Get()
  @RequirePermissions('vehicles.read')
  @ApiOperation({ summary: 'Lister les vehicules' })
  @ApiOkResponse({ description: 'Liste des vehicules retournee.' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.read requise.' })
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('vehicles.read')
  @ApiOperation({ summary: 'Recuperer un vehicule par id' })
  @ApiParam({ name: 'id', description: 'UUID du vehicule' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.read requise.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Get(':id/availability')
  @RequirePermissions('vehicles.read')
  @ApiOperation({ summary: 'Verifier disponibilite d un vehicule' })
  @ApiParam({ name: 'id', description: 'UUID du vehicule' })
  @ApiQuery({ name: 'startAt', required: false, type: String })
  @ApiQuery({ name: 'endAt', required: false, type: String })
  checkAvailability(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ) {
    return this.vehiclesService.checkAvailability(id, startAt, endAt);
  }

  @Patch(':id')
  @RequirePermissions('vehicles.write')
  @ApiOperation({ summary: 'Mettre a jour un vehicule' })
  @ApiParam({ name: 'id', description: 'UUID du vehicule' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.write requise.' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicles.delete')
  @ApiOperation({ summary: 'Supprimer un vehicule' })
  @ApiParam({ name: 'id', description: 'UUID du vehicule' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.delete requise.' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.vehiclesService.remove(id);
  }
}
