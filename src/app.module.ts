import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthOtp } from './auth/entities/auth-otp.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { FleetModule } from './fleet/fleet.module';
import { FleetIncident } from './fleet/entities/fleet-incident.entity';
import { VehicleScheduleSlot } from './fleet/entities/vehicle-schedule-slot.entity';
import { Permission } from './iam/entities/permission.entity';
import { RolePermission } from './iam/entities/role-permission.entity';
import { Role } from './iam/entities/role.entity';
import { UserRole } from './iam/entities/user-role.entity';
import { IamModule } from './iam/iam.module';
import { ReservationEvent } from './reservations/entities/reservation-event.entity';
import { Reservation } from './reservations/entities/reservation.entity';
import { ReservationsModule } from './reservations/reservations.module';
import { CompanyProfile } from './users/entities/company-profile.entity';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { VehicleImage } from './vehicles/entities/vehicle-image.entity';
import { Vehicle } from './vehicles/entities/vehicle.entity';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    // Tests can bootstrap the app without opening a real database connection.
    ...(process.env.NODE_ENV === 'test' || process.env.SKIP_DB === 'true'
      ? []
      : [
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              type: 'postgres',
              url: configService.getOrThrow<string>('DATABASE_URL'),
              uuidExtension: 'pgcrypto',
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
              migrations: ['dist/database/migrations/*.js'],
              // Keep schema and startup seed in sync without manual migration step.
              migrationsRun: true,
              synchronize: false,
              ssl: configService.get<string>('DB_SSL') === 'true',
            }),
          }),
        ]),
    ...(process.env.NODE_ENV === 'test' || process.env.SKIP_DB === 'true'
      ? []
      : [
          UsersModule,
          IamModule,
          AuthModule,
          VehiclesModule,
          FleetModule,
          ReservationsModule,
        ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
