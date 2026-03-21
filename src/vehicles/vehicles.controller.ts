import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  ParseIntPipe,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../iam/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../iam/guards/permissions.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vehicles.write')
  @ApiOperation({ summary: 'Creer un vehicule' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.write requise.' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les vehicules' })
  @ApiOkResponse({ description: 'Liste des vehicules retournee.' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.vehiclesService.findAll(page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vehicles.read')
  @ApiOperation({ summary: 'Recuperer un vehicule par id' })
  @ApiParam({ name: 'id', description: 'UUID du vehicule' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.read requise.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Get(':id/availability')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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

  @Post(':id/images/upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vehicles.write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Uploader une image vehicule vers Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        sortOrder: {
          type: 'integer',
          example: 0,
        },
      },
      required: ['file'],
    },
  })
  uploadImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('sortOrder', new ParseIntPipe({ optional: true }))
    sortOrder?: number,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.vehiclesService.uploadImage(id, file, sortOrder ?? 0);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vehicles.write')
  @ApiOperation({ summary: 'Supprimer une image vehicule (Cloudinary + DB)' })
  removeImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('imageId', new ParseUUIDPipe()) imageId: string,
  ) {
    return this.vehiclesService.removeImage(id, imageId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vehicles.delete')
  @ApiOperation({ summary: 'Supprimer un vehicule' })
  @ApiParam({ name: 'id', description: 'UUID du vehicule' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission vehicles.delete requise.' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.vehiclesService.remove(id);
  }
}
