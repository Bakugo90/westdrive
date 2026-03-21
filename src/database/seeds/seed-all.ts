import { config } from 'dotenv';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import dataSource from '../data-source';
import { User, UserStatus } from '../../users/entities/user.entity';
import {
  Vehicle,
  VehicleOperationalStatus,
} from '../../vehicles/entities/vehicle.entity';
import { Permission } from '../../iam/entities/permission.entity';
import { Role } from '../../iam/entities/role.entity';
import { RolePermission } from '../../iam/entities/role-permission.entity';
import { UserRole } from '../../iam/entities/user-role.entity';
import { SYSTEM_PERMISSIONS } from '../../iam/enums/system-permissions';

config({ path: '.env.local' });
config();

type SeedRole = {
  name: string;
  description: string;
  isSystem: boolean;
  permissionCodes: string[];
};

type SeedUser = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  password: string;
  roleNames: string[];
};

type SeedVehicle = Omit<Partial<Vehicle>, 'images'> & {
  images: Array<{
    url: string;
    publicId: string | null;
    sortOrder: number;
  }>;
};

async function seedPermissions(permissionRepository: Repository<Permission>) {
  for (const code of SYSTEM_PERMISSIONS) {
    const existing = await permissionRepository.findOne({ where: { code } });
    if (!existing) {
      await permissionRepository.save(
        permissionRepository.create({
          code,
          label: code,
        }),
      );
      console.log(`Permission seeded: ${code}`);
    }
  }
}

async function ensureRole(
  roleRepository: Repository<Role>,
  rolePermissionRepository: Repository<RolePermission>,
  permissionRepository: Repository<Permission>,
  roleSeed: SeedRole,
): Promise<Role> {
  let role = await roleRepository.findOne({ where: { name: roleSeed.name } });

  if (!role) {
    role = await roleRepository.save(
      roleRepository.create({
        name: roleSeed.name,
        description: roleSeed.description,
        isSystem: roleSeed.isSystem,
      }),
    );
    console.log(`Role seeded: ${roleSeed.name}`);
  }

  const permissions = await permissionRepository.find({
    where: roleSeed.permissionCodes.map((code) => ({ code })),
  });

  const existingRolePermissions = await rolePermissionRepository.find({
    where: { roleId: role.id },
    relations: { permission: true },
  });

  const existingCodes = new Set(
    existingRolePermissions.map(
      (rolePermission) => rolePermission.permission.code,
    ),
  );

  for (const permission of permissions) {
    if (existingCodes.has(permission.code)) {
      continue;
    }

    await rolePermissionRepository.save(
      rolePermissionRepository.create({
        roleId: role.id,
        permissionId: permission.id,
      }),
    );
  }

  return role;
}

async function ensureUser(
  userRepository: Repository<User>,
  userRoleRepository: Repository<UserRole>,
  roleRepository: Repository<Role>,
  userSeed: SeedUser,
): Promise<void> {
  let user = await userRepository.findOne({ where: { email: userSeed.email } });

  if (!user) {
    user = await userRepository.save(
      userRepository.create({
        email: userSeed.email,
        passwordHash: await argon2.hash(userSeed.password),
        firstName: userSeed.firstName,
        lastName: userSeed.lastName,
        phone: userSeed.phone,
        role: userSeed.role,
        status: UserStatus.ACTIF,
      }),
    );
    console.log(`User seeded: ${userSeed.email}`);
  }

  for (const roleName of userSeed.roleNames) {
    const role = await roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      continue;
    }

    const existingUserRole = await userRoleRepository.findOne({
      where: {
        userId: user.id,
        roleId: role.id,
      },
    });

    if (!existingUserRole) {
      await userRoleRepository.save(
        userRoleRepository.create({
          userId: user.id,
          roleId: role.id,
        }),
      );
    }
  }
}

async function seedVehicles(vehicleRepository: Repository<Vehicle>) {
  const vehicles: SeedVehicle[] = [
    {
      name: 'Peugeot 108',
      brand: 'Peugeot',
      model: '108',
      year: 2021,
      category: 'MICRO',
      transmission: 'MANUELLE',
      energy: 'ESSENCE',
      seats: 4,
      includedKmPerDay: 150,
      pricePerDay: '35.00',
      isActive: true,
      rating: '4.5',
      reviewCount: 23,
      operationalStatus: VehicleOperationalStatus.DISPONIBLE,
      availableCities: ['Paris', 'Nanterre'],
      streetAddress: '12 Rue de Rivoli',
      city: 'Paris',
      latitude: '48.8566140',
      longitude: '2.3522219',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1542362567-b07e54358753',
          publicId: null,
          sortOrder: 0,
        },
      ],
    },
    {
      name: 'Fiat 500',
      brand: 'Fiat',
      model: '500',
      year: 2022,
      category: 'MICRO',
      transmission: 'AUTOMATIQUE',
      energy: 'HYBRIDE',
      seats: 4,
      includedKmPerDay: 150,
      pricePerDay: '40.00',
      isActive: true,
      rating: '4.7',
      reviewCount: 18,
      operationalStatus: VehicleOperationalStatus.DISPONIBLE,
      availableCities: ['Paris'],
      streetAddress: '20 Rue de la Paix',
      city: 'Paris',
      latitude: '48.8698000',
      longitude: '2.3316000',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d',
          publicId: null,
          sortOrder: 0,
        },
      ],
    },
    {
      name: 'Citroen C1',
      brand: 'Citroen',
      model: 'C1',
      year: 2021,
      category: 'MICRO',
      transmission: 'MANUELLE',
      energy: 'ESSENCE',
      seats: 4,
      includedKmPerDay: 150,
      pricePerDay: '32.00',
      isActive: true,
      rating: '4.3',
      reviewCount: 14,
      operationalStatus: VehicleOperationalStatus.DISPONIBLE,
      availableCities: ['Paris', 'Boulogne-Billancourt'],
      streetAddress: '5 Avenue de la Grande Armee',
      city: 'Paris',
      latitude: '48.8738000',
      longitude: '2.2950000',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1493238792000-8113da705763',
          publicId: null,
          sortOrder: 0,
        },
      ],
    },
  ];

  for (const vehicleSeed of vehicles) {
    const existing = await vehicleRepository.findOne({
      where: {
        name: vehicleSeed.name,
        year: vehicleSeed.year,
      },
      relations: { images: true },
    });

    if (existing) {
      continue;
    }

    await vehicleRepository.save(
      vehicleRepository.create({
        ...vehicleSeed,
        images: vehicleSeed.images.map((image) => ({
          ...image,
        })),
      }),
    );
    console.log(`Vehicle seeded: ${vehicleSeed.name}`);
  }
}

async function seedAll() {
  await dataSource.initialize();

  try {
    const permissionRepository = dataSource.getRepository(Permission);
    const roleRepository = dataSource.getRepository(Role);
    const rolePermissionRepository = dataSource.getRepository(RolePermission);
    const userRepository = dataSource.getRepository(User);
    const userRoleRepository = dataSource.getRepository(UserRole);
    const vehicleRepository = dataSource.getRepository(Vehicle);

    await seedPermissions(permissionRepository);

    const roleSeeds: SeedRole[] = [
      {
        name: 'ADMIN',
        description: 'System administrator',
        isSystem: true,
        permissionCodes: [...SYSTEM_PERMISSIONS],
      },
      {
        name: 'FLEET_MANAGER',
        description: 'Gestion operationnelle de la flotte',
        isSystem: false,
        permissionCodes: [
          'fleet.read',
          'fleet.manage',
          'vehicles.read',
          'vehicles.write',
        ],
      },
      {
        name: 'CUSTOMER_SUPPORT',
        description: 'Support client et suivi reservations',
        isSystem: false,
        permissionCodes: [
          'users.read',
          'reservations.read',
          'reservations.manage',
        ],
      },
      {
        name: 'SALES_AGENT',
        description: 'Suivi commercial des reservations',
        isSystem: false,
        permissionCodes: [
          'reservations.read',
          'reservations.manage',
          'vehicles.read',
        ],
      },
    ];

    for (const roleSeed of roleSeeds) {
      await ensureRole(
        roleRepository,
        rolePermissionRepository,
        permissionRepository,
        roleSeed,
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@westdrive.fr';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMeStrongPassword';

    const usersToSeed: SeedUser[] = [
      {
        email: adminEmail,
        firstName: process.env.ADMIN_FIRST_NAME ?? 'WestDrive',
        lastName: process.env.ADMIN_LAST_NAME ?? 'Admin',
        phone: process.env.ADMIN_PHONE ?? '+33000000000',
        role: 'ADMIN',
        password: adminPassword,
        roleNames: ['ADMIN'],
      },
      {
        email: 'fleet.manager@westdrive.fr',
        firstName: 'Maya',
        lastName: 'Benali',
        phone: '+33611112222',
        role: 'FLEET_MANAGER',
        password: 'FleetManager123!',
        roleNames: ['FLEET_MANAGER'],
      },
      {
        email: 'support.agent@westdrive.fr',
        firstName: 'Hugo',
        lastName: 'Martin',
        phone: '+33622223333',
        role: 'CUSTOMER_SUPPORT',
        password: 'SupportAgent123!',
        roleNames: ['CUSTOMER_SUPPORT'],
      },
      {
        email: 'sales.agent@westdrive.fr',
        firstName: 'Ines',
        lastName: 'Diallo',
        phone: '+33633334444',
        role: 'SALES_AGENT',
        password: 'SalesAgent123!',
        roleNames: ['SALES_AGENT'],
      },
    ];

    for (const userSeed of usersToSeed) {
      await ensureUser(
        userRepository,
        userRoleRepository,
        roleRepository,
        userSeed,
      );
    }

    await seedVehicles(vehicleRepository);

    console.log('Seed all completed successfully.');
  } finally {
    await dataSource.destroy();
  }
}

seedAll().catch((error: unknown) => {
  console.error('Seed all failed:', error);
  process.exit(1);
});
