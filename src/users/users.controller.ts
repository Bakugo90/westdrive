import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermissions } from '../iam/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../iam/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Recuperer le contexte securite du token courant',
    description:
      'Retourne le sujet JWT, roles resolves et permissions resolves pour le user authentifie.',
  })
  @ApiOkResponse({
    description: 'Contexte utilisateur courant.',
    schema: {
      example: {
        sub: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
        email: 'admin@westdrive.fr',
        role: 'ADMIN',
        roles: ['ADMIN'],
        permissions: [
          'users.read',
          'users.status.write',
          'roles.read',
          'roles.write',
          'roles.assign',
          'admin.kpi.read',
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  getMe(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({
    summary: 'Lister les utilisateurs',
    description: 'Necessite la permission systeme users.read.',
  })
  @ApiOkResponse({
    description: 'Liste des utilisateurs retournee.',
    schema: {
      example: [
        {
          id: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
          email: 'admin@westdrive.fr',
          firstName: 'WestDrive',
          lastName: 'Admin',
          phone: '+33000000000',
          role: 'ADMIN',
          status: 'ACTIF',
          createdAt: '2026-03-18T16:30:31.000Z',
          userRoles: [
            {
              id: 'c26fb00b-6be3-4d7f-b01a-3b1942a06a2a',
              userId: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
              roleId: '4ca247ea-c8fa-4747-a434-81c520ddf3d2',
              createdAt: '2026-03-18T16:30:31.000Z',
              role: {
                id: '4ca247ea-c8fa-4747-a434-81c520ddf3d2',
                name: 'ADMIN',
                description: 'System administrator',
                isSystem: true,
                createdAt: '2026-03-18T16:30:31.000Z',
              },
            },
          ],
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission insuffisante (users.read requise).',
  })
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.usersService.listUsers(page, limit);
  }

  @Post()
  @RequirePermissions('users.write')
  @ApiOperation({
    summary: 'Creer un utilisateur',
    description: 'Necessite la permission users.write.',
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission insuffisante (users.write requise).',
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({
    summary: 'Recuperer un utilisateur par id',
    description: 'Necessite la permission users.read.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l utilisateur',
    example: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission insuffisante (users.read requise).',
  })
  getUserById(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.usersService.getById(userId);
  }

  @Patch(':id')
  @RequirePermissions('users.write')
  @ApiOperation({
    summary: 'Mettre a jour un utilisateur',
    description: 'Necessite la permission users.write.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l utilisateur a modifier',
    example: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission insuffisante (users.write requise).',
  })
  updateUser(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('users.status.write')
  @ApiOperation({
    summary: 'Mettre a jour le statut d un utilisateur',
    description: 'Necessite la permission users.status.write.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l utilisateur a mettre a jour',
    example: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
  })
  @ApiOkResponse({ description: 'Statut utilisateur mis a jour.' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission insuffisante (users.status.write requise).',
  })
  updateUserStatus(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(userId, dto.status);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ApiOperation({
    summary: 'Supprimer un utilisateur',
    description: 'Necessite la permission users.delete.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l utilisateur a supprimer',
    example: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({
    description: 'Permission insuffisante (users.delete requise).',
  })
  removeUser(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.usersService.remove(userId);
  }
}
