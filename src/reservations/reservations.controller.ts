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
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../iam/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../iam/guards/permissions.guard';
import { CreateReservationEventDto } from './dto/create-reservation-event.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateStripePreauthDto } from './dto/create-stripe-preauth.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Creer une reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.manage requise.',
  })
  create(@Body() dto: CreateReservationDto) {
    return this.reservationsService.create(dto);
  }

  @Get()
  @RequirePermissions('reservations.read')
  @ApiOperation({ summary: 'Lister les reservations' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.read requise.',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.reservationsService.findAll(page, limit);
  }

  @Get(':id')
  @RequirePermissions('reservations.read')
  @ApiOperation({ summary: 'Recuperer une reservation par id' })
  @ApiParam({ name: 'id', description: 'UUID de la reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.read requise.',
  })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Mettre a jour une reservation' })
  @ApiParam({ name: 'id', description: 'UUID de la reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.manage requise.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Changer le statut d une reservation' })
  @ApiParam({ name: 'id', description: 'UUID de la reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.manage requise.',
  })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.reservationsService.updateStatus(id, dto);
  }

  @Post(':id/stripe-preauth')
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Creer une preautorisation Stripe de reservation' })
  @ApiParam({ name: 'id', description: 'UUID de la reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.manage requise.',
  })
  createStripePreauth(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateStripePreauthDto,
  ) {
    return this.reservationsService.createStripePreauth(id, dto);
  }

  @Post(':id/events')
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Ajouter un evenement timeline a une reservation' })
  @ApiParam({ name: 'id', description: 'UUID de la reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.manage requise.',
  })
  createEvent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateReservationEventDto,
  ) {
    return this.reservationsService.createEvent(id, dto);
  }

  @Get(':id/events')
  @RequirePermissions('reservations.read')
  @ApiOperation({ summary: 'Lister la timeline d une reservation' })
  @ApiParam({ name: 'id', description: 'UUID de la reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.read requise.',
  })
  findEvents(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.reservationsService.findEvents(id, page, limit);
  }

  @Delete(':id')
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Supprimer une reservation' })
  @ApiParam({ name: 'id', description: 'UUID de la reservation' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission reservations.manage requise.',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.remove(id);
  }
}
