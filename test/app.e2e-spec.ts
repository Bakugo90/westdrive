/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { GlobalHttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { ApiResponseInterceptor } from '../src/shared/interceptors/api-response.interceptor';
import { SanitizeInputPipe } from '../src/shared/pipes/sanitize-input.pipe';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let adminAccessToken = '';
  let createdUserEmail = '';
  let createdUserId = '';
  let customRoleId = '';
  let createdVehicleId = '';
  let crudUserId = '';
  let limitedUserToken = '';
  let limitedUserId = '';
  let limitedRoleId = '';
  let adminEmail = '';
  let adminPassword = '';

  const unwrapTokenPayload = (token: string): Record<string, unknown> => {
    const parts = token.split('.');
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
    return JSON.parse(
      Buffer.from(padded, 'base64').toString('utf-8'),
    ) as Record<string, unknown>;
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.SKIP_DB = 'false';
    adminEmail = `admin.e2e.${Date.now()}@westdrive.fr`;
    adminPassword = 'AdminE2eStrongPassword123!';
    process.env.ADMIN_EMAIL = adminEmail;
    process.env.ADMIN_PASSWORD = adminPassword;

    // Load AppModule after env flags are set so module-level conditional imports are correct.
    const { AppModule } = require('../src/app.module') as {
      AppModule: new (...args: never[]) => unknown;
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new SanitizeInputPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        stopAtFirstError: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET) should return wrapped success response', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer).get('/').expect(200);

    expect(response.body).toMatchObject({
      status: 'success',
      code: 200,
      message: expect.any(String),
      data: 'Hello World!',
    });
  });

  it('/health (GET) should return wrapped success response', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'success',
      code: 200,
      data: { status: 'ok' },
      message: expect.any(String),
    });
  });

  it('/auth/login (POST) should authenticate admin and return JWT pair', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'success',
      code: 201,
      message: expect.any(String),
      data: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
      },
    });

    adminAccessToken = response.body.data.accessToken;
  });

  it('/auth/register + /auth/register/confirm (POST) should create user with OTP flow', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    createdUserEmail = `client.${Date.now()}@westdrive.fr`;

    const registerResponse = await request(httpServer)
      .post('/auth/register')
      .send({
        email: createdUserEmail,
        password: 'StrongPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+33612345678',
      })
      .expect(201);

    expect(registerResponse.body).toMatchObject({
      status: 'success',
      code: 201,
      data: { message: 'OTP sent' },
      message: expect.any(String),
    });

    const confirmResponse = await request(httpServer)
      .post('/auth/register/confirm')
      .send({
        email: createdUserEmail,
        otp: process.env.OTP_FIXED_CODE ?? '123456',
      })
      .expect(201);

    expect(confirmResponse.body).toMatchObject({
      status: 'success',
      code: 201,
      data: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
      },
      message: expect.any(String),
    });

    const payload = unwrapTokenPayload(confirmResponse.body.data.accessToken);
    createdUserId = typeof payload.sub === 'string' ? payload.sub : '';
    expect(createdUserId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('/auth/refresh (POST) should rotate refresh token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const login = await request(httpServer)
      .post('/auth/login')
      .send({
        email: createdUserEmail,
        password: 'StrongPassword123!',
      })
      .expect(201);

    const oldRefreshToken = login.body.data.refreshToken as string;

    const refreshResponse = await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(201);

    expect(refreshResponse.body).toMatchObject({
      status: 'success',
      code: 201,
      data: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
      },
    });

    await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
  });

  it('/auth/forgot-password + /auth/reset-password (POST) should reset password', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const forgotResponse = await request(httpServer)
      .post('/auth/forgot-password')
      .send({ email: createdUserEmail })
      .expect(201);

    expect(forgotResponse.body).toMatchObject({
      status: 'success',
      code: 201,
      data: { message: 'If this account exists, an OTP has been sent' },
    });

    const resetResponse = await request(httpServer)
      .post('/auth/reset-password')
      .send({
        email: createdUserEmail,
        otp: process.env.OTP_FIXED_CODE ?? '123456',
        newPassword: 'NewStrongPassword123!',
      })
      .expect(201);

    expect(resetResponse.body).toMatchObject({
      status: 'success',
      code: 201,
      data: { message: 'Password updated successfully' },
    });
  });

  it('/users (GET) should reject unauthenticated request with global error shape', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer).get('/users').expect(401);

    expect(response.body).toMatchObject({
      status: 'error',
      code: 401,
      data: {
        path: '/users',
        timestamp: expect.any(String),
      },
      message: expect.any(String),
    });
  });

  it('/users/me (GET) should return admin context', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .get('/users/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'success',
      code: 200,
      data: {
        email: adminEmail,
        role: 'ADMIN',
        permissions: expect.any(Array),
      },
    });
  });

  it('/users (GET) and /users/:id/status (PATCH) should list and update user status', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const listResponse = await request(httpServer)
      .get('/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(listResponse.body).toMatchObject({
      status: 'success',
      code: 200,
      data: expect.any(Array),
    });

    const targetUser = (
      listResponse.body.data as Array<{ id: string; email: string }>
    ).find((user) => user.email === createdUserEmail);
    expect(targetUser).toBeDefined();

    const patchResponse = await request(httpServer)
      .patch(`/users/${targetUser?.id}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ status: 'SUSPENDU' })
      .expect(200);

    expect(patchResponse.body).toMatchObject({
      status: 'success',
      code: 200,
      data: {
        id: targetUser?.id,
        status: 'SUSPENDU',
      },
    });
  });

  it('/iam/permissions and /iam/roles (GET) should return IAM resources', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const permissions = await request(httpServer)
      .get('/iam/permissions')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(permissions.body).toMatchObject({
      status: 'success',
      code: 200,
      data: expect.any(Array),
    });

    const roles = await request(httpServer)
      .get('/iam/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(roles.body).toMatchObject({
      status: 'success',
      code: 200,
      data: expect.any(Array),
    });
  });

  it('/iam role management endpoints should create, update and assign role', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const roleName = `qa_role_${Date.now()}`;

    const createRole = await request(httpServer)
      .post('/iam/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: roleName,
        description: 'QA role for e2e tests',
        permissionCodes: ['roles.read', 'users.read'],
      })
      .expect(201);

    expect(createRole.body).toMatchObject({
      status: 'success',
      code: 201,
      data: {
        id: expect.any(String),
        name: roleName.toUpperCase(),
      },
    });

    customRoleId = createRole.body.data.id as string;

    const updateRole = await request(httpServer)
      .patch(`/iam/roles/${customRoleId}/permissions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ permissionCodes: ['users.read'] })
      .expect(200);

    expect(updateRole.body).toMatchObject({
      status: 'success',
      code: 200,
      data: {
        id: customRoleId,
      },
    });

    const assignRole = await request(httpServer)
      .post(`/iam/roles/${customRoleId}/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);

    expect(assignRole.body).toMatchObject({
      status: 'success',
      code: 201,
      data: {
        roleId: customRoleId,
        userId: createdUserId,
      },
    });
  });

  it('/users CRUD should work end-to-end for admin role', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const unique = Date.now();

    const createUser = await request(httpServer)
      .post('/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: `crud.user.${unique}@westdrive.fr`,
        password: 'CrudUserPassword123!',
        firstName: 'Crud',
        lastName: 'User',
        phone: '+33611112222',
        role: 'CUSTOMER',
      })
      .expect(201);

    expect(createUser.body).toMatchObject({
      status: 'success',
      code: 201,
      data: {
        id: expect.any(String),
        email: `crud.user.${unique}@westdrive.fr`,
      },
    });

    crudUserId = createUser.body.data.id as string;

    const getUser = await request(httpServer)
      .get(`/users/${crudUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(getUser.body).toMatchObject({
      status: 'success',
      code: 200,
      data: {
        id: crudUserId,
      },
    });

    const updateUser = await request(httpServer)
      .patch(`/users/${crudUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        firstName: 'CrudUpdated',
        role: 'CUSTOMER_SUPPORT',
      })
      .expect(200);

    expect(updateUser.body).toMatchObject({
      status: 'success',
      code: 200,
      data: {
        id: crudUserId,
        firstName: 'CrudUpdated',
        role: 'CUSTOMER_SUPPORT',
      },
    });

    const deleteUser = await request(httpServer)
      .delete(`/users/${crudUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(deleteUser.body).toMatchObject({
      status: 'success',
      code: 200,
      data: {
        message: 'User deleted successfully',
      },
    });
  });

  it('/vehicles CRUD should work for admin and enforce permissions for read-only role', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const ts = Date.now();

    const createVehicle = await request(httpServer)
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: `Tesla Model X ${ts}`,
        brand: 'Tesla',
        model: 'Model X',
        year: 2024,
        category: 'SUV',
        transmission: 'AUTOMATIQUE',
        energy: 'ELECTRIQUE',
        seats: 7,
        includedKmPerDay: 250,
        pricePerDay: 199.99,
        isActive: true,
        availableCities: ['Paris', 'Nanterre'],
        streetAddress: '12 Rue de Rivoli',
        city: 'Paris',
        latitude: 48.856614,
        longitude: 2.3522219,
        images: [
          {
            url: 'https://cdn.westdrive.fr/vehicles/model-x/front.jpg',
            sortOrder: 0,
          },
        ],
      })
      .expect(201);

    expect(createVehicle.body).toMatchObject({
      status: 'success',
      code: 201,
      data: {
        id: expect.any(String),
        brand: 'Tesla',
      },
    });
    createdVehicleId = createVehicle.body.data.id as string;

    await request(httpServer)
      .get('/vehicles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer)
      .get(`/vehicles/${createdVehicleId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer)
      .get(`/vehicles/${createdVehicleId}/availability`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        startAt: '2026-04-01T08:00:00Z',
        endAt: '2026-04-01T12:00:00Z',
      })
      .expect(200);

    await request(httpServer)
      .patch(`/vehicles/${createdVehicleId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        city: 'Nanterre',
        isActive: true,
      })
      .expect(200);

    const limitedRoleName = `role_vehicle_reader_${ts}`;
    const limitedRole = await request(httpServer)
      .post('/iam/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: limitedRoleName,
        description: 'Read-only vehicle role',
        permissionCodes: ['vehicles.read', 'users.read'],
      })
      .expect(201);

    limitedRoleId = limitedRole.body.data.id as string;

    limitedUserId = '';
    const limitedUserEmail = `limited.reader.${ts}@westdrive.fr`;

    await request(httpServer)
      .post('/auth/register')
      .send({
        email: limitedUserEmail,
        password: 'LimitedReaderPassword123!',
        firstName: 'Limited',
        lastName: 'Reader',
        phone: '+33633334444',
      })
      .expect(201);

    const limitedConfirm = await request(httpServer)
      .post('/auth/register/confirm')
      .send({
        email: limitedUserEmail,
        otp: process.env.OTP_FIXED_CODE ?? '123456',
      })
      .expect(201);

    const limitedPayload = unwrapTokenPayload(
      limitedConfirm.body.data.accessToken as string,
    );
    limitedUserId =
      typeof limitedPayload.sub === 'string' ? limitedPayload.sub : '';

    await request(httpServer)
      .post(`/iam/roles/${limitedRoleId}/users/${limitedUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201);

    const limitedLogin = await request(httpServer)
      .post('/auth/login')
      .send({
        email: limitedUserEmail,
        password: 'LimitedReaderPassword123!',
      })
      .expect(201);

    limitedUserToken = limitedLogin.body.data.accessToken as string;

    await request(httpServer)
      .get('/vehicles')
      .set('Authorization', `Bearer ${limitedUserToken}`)
      .expect(200);

    await request(httpServer)
      .post('/vehicles')
      .set('Authorization', `Bearer ${limitedUserToken}`)
      .send({
        name: 'Forbidden Vehicle',
        brand: 'Ford',
        model: 'Mustang',
        year: 2023,
        category: 'SPORT',
        transmission: 'MANUELLE',
        energy: 'ESSENCE',
        seats: 4,
        includedKmPerDay: 150,
        pricePerDay: 120,
        streetAddress: '10 Avenue Victor Hugo',
        city: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
      })
      .expect(403);

    const deleteVehicle = await request(httpServer)
      .delete(`/vehicles/${createdVehicleId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(deleteVehicle.body).toMatchObject({
      status: 'success',
      code: 200,
      data: {
        message: 'Vehicle deleted successfully',
      },
    });
  });

  it('validation should be enforced by global ValidationPipe', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer)
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: 'short',
        firstName: 'X',
        lastName: 'Y',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 'error',
      code: 400,
      data: {
        path: '/auth/register',
        timestamp: expect.any(String),
      },
      message: expect.any(String),
    });
  });
});
