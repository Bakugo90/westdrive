import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { AuthOtp } from '../auth/entities/auth-otp.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Permission } from '../iam/entities/permission.entity';
import { RolePermission } from '../iam/entities/role-permission.entity';
import { Role } from '../iam/entities/role.entity';
import { UserRole } from '../iam/entities/user-role.entity';
import { User } from '../users/entities/user.entity';

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
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
