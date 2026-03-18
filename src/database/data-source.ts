import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

// Load local overrides first, then fallback to .env.
config({ path: '.env.local' });
config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  uuidExtension: 'pgcrypto',
  ssl: process.env.DB_SSL === 'true',
  entities: [User],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
