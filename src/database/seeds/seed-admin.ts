import { config } from 'dotenv';
import * as argon2 from 'argon2';
import dataSource from '../data-source';
import { User, UserStatus } from '../../users/entities/user.entity';

config({ path: '.env.local' });
config();

async function seedAdmin() {
  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(User);

    const email = process.env.ADMIN_EMAIL as string;
    const password = process.env.ADMIN_PASSWORD as string;

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
    }

    const existingAdmin = await userRepository.findOne({ where: { email } });

    if (existingAdmin) {
      console.log(`Admin ${email} already exists, skipping seed.`);
      return;
    }

    const passwordHash = await argon2.hash(password);
    const adminUser = userRepository.create({
      email,
      passwordHash,
      firstName: process.env.ADMIN_FIRST_NAME ?? 'WestDrive',
      lastName: process.env.ADMIN_LAST_NAME ?? 'Admin',
      phone: process.env.ADMIN_PHONE ?? '+33000000000',
      role: 'ADMIN',
      status: UserStatus.ACTIF,
    });

    await userRepository.save(adminUser);
    console.log(`Admin ${email} created successfully.`);
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error('Admin seed failed:', error);
  process.exit(1);
});
