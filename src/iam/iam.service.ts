import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { In, Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  resolvePagination,
  type PaginatedResponse,
} from '../shared/pagination/pagination.util';
import { User, UserStatus } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { SYSTEM_PERMISSIONS } from './enums/system-permissions';

@Injectable()
export class IamService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IamService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_DB === 'true') {
      return;
    }

    this.logger.log('Bootstrapping IAM seed (permissions, admin role, admin user)');
    await this.seedSystemPermissions();
    const adminRole = await this.seedAdminRole();
    await this.seedAdminUser(adminRole.id);
    this.logger.log('IAM seed completed');
  }

  async listPermissions(
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Permission>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.permissionRepository.findAndCount({
      order: { code: 'ASC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return buildPaginatedResponse(
      items,
      pagination.page,
      pagination.limit,
      totalItems,
    );
  }

  async listRoles(page = 1, limit = 20): Promise<PaginatedResponse<Role>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.roleRepository.findAndCount({
      relations: {
        rolePermissions: {
          permission: true,
        },
      },
      order: { createdAt: 'ASC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return buildPaginatedResponse(
      items,
      pagination.page,
      pagination.limit,
      totalItems,
    );
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: dto.name.toUpperCase() },
    });

    if (existingRole) {
      throw new BadRequestException('Role already exists');
    }

    const permissions = await this.findPermissions(dto.permissionCodes);
    const role = await this.roleRepository.save(
      this.roleRepository.create({
        name: dto.name.toUpperCase(),
        description: dto.description ?? null,
        isSystem: false,
      }),
    );

    await this.replaceRolePermissions(role, permissions);

    return this.roleRepository.findOneOrFail({
      where: { id: role.id },
      relations: { rolePermissions: { permission: true } },
    });
  }

  async updateRolePermissions(
    roleId: string,
    dto: UpdateRolePermissionsDto,
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.findPermissions(dto.permissionCodes);
    await this.replaceRolePermissions(role, permissions);

    return this.roleRepository.findOneOrFail({
      where: { id: roleId },
      relations: { rolePermissions: { permission: true } },
    });
  }

  async assignRoleToUser(roleId: string, userId: string): Promise<UserRole> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingLink = await this.userRoleRepository.findOne({
      where: { roleId, userId },
    });

    if (existingLink) {
      return existingLink;
    }

    const userRole = this.userRoleRepository.create({
      role,
      user,
      roleId,
      userId,
    });

    return this.userRoleRepository.save(userRole);
  }

  async getUserSecurityContext(userId: string): Promise<{
    roles: string[];
    permissions: string[];
  }> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: {
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    const roles = userRoles.map((userRole) => userRole.role.name);
    const permissions = [
      ...new Set(
        userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map(
            (rolePermission) => rolePermission.permission.code,
          ),
        ),
      ),
    ];

    return { roles, permissions };
  }

  private async seedSystemPermissions(): Promise<void> {
    for (const code of SYSTEM_PERMISSIONS) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { code },
      });

      if (!existingPermission) {
        await this.permissionRepository.save(
          this.permissionRepository.create({
            code,
            label: code,
          }),
        );
      }
    }
  }

  private async seedAdminRole(): Promise<Role> {
    let adminRole = await this.roleRepository.findOne({
      where: { name: 'ADMIN' },
      relations: {
        rolePermissions: true,
      },
    });

    if (!adminRole) {
      adminRole = await this.roleRepository.save(
        this.roleRepository.create({
          name: 'ADMIN',
          description: 'System administrator',
          isSystem: true,
        }),
      );
    }

    const allPermissions = await this.permissionRepository.find();
    await this.replaceRolePermissions(adminRole, allPermissions);

    return adminRole;
  }

  private async seedAdminUser(adminRoleId: string): Promise<void> {
    const adminEmail = this.configService.getOrThrow<string>('ADMIN_EMAIL');
    const adminPassword =
      this.configService.getOrThrow<string>('ADMIN_PASSWORD');

    let adminUser = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      const passwordHash = await argon2.hash(adminPassword);
      adminUser = await this.userRepository.save(
        this.userRepository.create({
          email: adminEmail,
          passwordHash,
          firstName:
            this.configService.get<string>('ADMIN_FIRST_NAME') ?? 'WestDrive',
          lastName:
            this.configService.get<string>('ADMIN_LAST_NAME') ?? 'Admin',
          phone:
            this.configService.get<string>('ADMIN_PHONE') ?? '+33000000000',
          role: 'ADMIN',
          status: UserStatus.ACTIF,
        }),
      );
      this.logger.log(`Admin user created from env: ${adminEmail}`);
    } else {
      this.logger.log(`Admin user already exists, skipping create: ${adminEmail}`);
    }

    const existingRoleLink = await this.userRoleRepository.findOne({
      where: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    });

    if (!existingRoleLink) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: adminUser.id,
          roleId: adminRoleId,
        }),
      );
      this.logger.log(`Admin role linked to user: ${adminEmail}`);
    } else {
      this.logger.log(`Admin role link already exists for: ${adminEmail}`);
    }
  }

  private async findPermissions(codes: string[]): Promise<Permission[]> {
    const uniqueCodes = [...new Set(codes)];
    const permissions = await this.permissionRepository.find({
      where: { code: In(uniqueCodes) },
    });

    if (permissions.length !== uniqueCodes.length) {
      throw new BadRequestException('Unknown permission code in payload');
    }

    return permissions;
  }

  private async replaceRolePermissions(
    role: Role,
    permissions: Permission[],
  ): Promise<void> {
    await this.rolePermissionRepository.delete({ roleId: role.id });

    if (permissions.length === 0) {
      return;
    }

    const newLinks = permissions.map((permission) =>
      this.rolePermissionRepository.create({
        role,
        permission,
        roleId: role.id,
        permissionId: permission.id,
      }),
    );

    await this.rolePermissionRepository.save(newLinks);
  }
}
