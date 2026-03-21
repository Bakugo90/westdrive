import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AuthOtp } from '../auth/entities/auth-otp.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { FleetIncident } from '../fleet/entities/fleet-incident.entity';
import { VehicleScheduleSlot } from '../fleet/entities/vehicle-schedule-slot.entity';
import { Permission } from '../iam/entities/permission.entity';
import { RolePermission } from '../iam/entities/role-permission.entity';
import { Role } from '../iam/entities/role.entity';
import { UserRole } from '../iam/entities/user-role.entity';
import { ReservationEvent } from '../reservations/entities/reservation-event.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CompanyProfile } from '../users/entities/company-profile.entity';
import { User } from '../users/entities/user.entity';
import { VehicleImage } from '../vehicles/entities/vehicle-image.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

// Load local overrides first, then fallback to .env.
config({ path: '.env.local' });
config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  uuidExtension: 'pgcrypto',
  ssl: process.env.DB_SSL === 'true',
  entities: [
    User,
    Permission,
    Role,
    RolePermission,
    UserRole,
    AuthOtp,
    RefreshToken,
    Vehicle,
    VehicleImage,
    FleetIncident,
    VehicleScheduleSlot,
    Reservation,
    ReservationEvent,
    CompanyProfile,
  ],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});
