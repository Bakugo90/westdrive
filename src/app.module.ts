import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/entities/user.entity';

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
              entities: [User],
              migrations: ['dist/database/migrations/*.js'],
              migrationsRun: false,
              synchronize: false,
              ssl: configService.get<string>('DB_SSL') === 'true',
            }),
          }),
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
