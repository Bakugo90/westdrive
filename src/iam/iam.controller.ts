import {
  Body,
  Controller,
  DefaultValuePipe,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { PermissionsGuard } from './guards/permissions.guard';
import { IamService } from './iam.service';

@ApiTags('IAM')
@ApiBearerAuth()
@Controller('iam')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IamController {
  constructor(private readonly iamService: IamService) {}

  @Get('permissions')
  @RequirePermissions('roles.read')
  @ApiOperation({
    summary: 'Lister les permissions systeme disponibles',
    description: 'Necessite roles.read.',
  })
  @ApiOkResponse({
    description: 'Liste des permissions retournee.',
    schema: {
      example: [
        {
          id: '58bfb5a2-59a9-4f91-83db-f1af49ee9002',
          code: 'users.read',
          label: 'users.read',
          createdAt: '2026-03-18T16:30:31.000Z',
        },
        {
          id: '8c9f5c74-1ca1-4ebe-8368-4eca9f877301',
          code: 'roles.write',
          label: 'roles.write',
          createdAt: '2026-03-18T16:30:31.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission roles.read requise.' })
  listPermissions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.iamService.listPermissions(page, limit);
  }

  @Get('roles')
  @RequirePermissions('roles.read')
  @ApiOperation({
    summary: 'Lister les roles avec leurs permissions',
    description: 'Necessite roles.read.',
  })
  @ApiOkResponse({
    description: 'Liste des roles retournee.',
    schema: {
      example: [
        {
          id: '4ca247ea-c8fa-4747-a434-81c520ddf3d2',
          name: 'ADMIN',
          description: 'System administrator',
          isSystem: true,
          createdAt: '2026-03-18T16:30:31.000Z',
          rolePermissions: [
            {
              id: '4fd95d44-e318-43f6-af81-4f12e009f614',
              roleId: '4ca247ea-c8fa-4747-a434-81c520ddf3d2',
              permissionId: '58bfb5a2-59a9-4f91-83db-f1af49ee9002',
              createdAt: '2026-03-18T16:30:31.000Z',
              permission: {
                id: '58bfb5a2-59a9-4f91-83db-f1af49ee9002',
                code: 'users.read',
                label: 'users.read',
                createdAt: '2026-03-18T16:30:31.000Z',
              },
            },
          ],
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission roles.read requise.' })
  listRoles(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.iamService.listRoles(page, limit);
  }

  @Post('roles')
  @RequirePermissions('roles.write')
  @ApiOperation({
    summary: 'Creer un role custom',
    description:
      'Cree un role metier personnalisable et lui associe une liste de permissions systeme.',
  })
  @ApiOkResponse({ description: 'Role cree avec succes.' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission roles.write requise.' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.iamService.createRole(dto);
  }

  @Patch('roles/:roleId/permissions')
  @RequirePermissions('roles.write')
  @ApiOperation({
    summary: 'Remplacer les permissions d un role',
    description:
      'Ecrase la liste actuelle des permissions du role avec la nouvelle liste.',
  })
  @ApiParam({
    name: 'roleId',
    description: 'UUID du role a mettre a jour',
    example: '4ca247ea-c8fa-4747-a434-81c520ddf3d2',
  })
  @ApiOkResponse({ description: 'Permissions du role mises a jour.' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission roles.write requise.' })
  updateRolePermissions(
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.iamService.updateRolePermissions(roleId, dto);
  }

  @Post('roles/:roleId/users/:userId')
  @RequirePermissions('roles.assign')
  @ApiOperation({
    summary: 'Assigner un role a un utilisateur',
    description:
      'Lie un role existant a un utilisateur existant. Operation idempotente.',
  })
  @ApiParam({
    name: 'roleId',
    description: 'UUID du role a assigner',
    example: '4ca247ea-c8fa-4747-a434-81c520ddf3d2',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID de l utilisateur cible',
    example: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
  })
  @ApiOkResponse({ description: 'Role assigne a l utilisateur.' })
  @ApiUnauthorizedResponse({ description: 'Token manquant ou invalide.' })
  @ApiForbiddenResponse({ description: 'Permission roles.assign requise.' })
  assignRoleToUser(
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.iamService.assignRoleToUser(roleId, userId);
  }
}
