import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserStatus } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    create: jest.fn(),
    getById: jest.fn(),
    listUsers: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('GET /users/me returns current user payload', () => {
    const authUser = {
      sub: 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0',
      email: 'admin@westdrive.fr',
      role: 'ADMIN',
      roles: ['ADMIN'],
      permissions: ['users.read'],
    };

    expect(controller.getMe(authUser)).toEqual(authUser);
  });

  it('GET /users calls listUsers', async () => {
    const expected = [{ id: '1', email: 'admin@westdrive.fr' }];
    usersServiceMock.listUsers.mockResolvedValue(expected);

    await expect(controller.listUsers()).resolves.toEqual(expected);
    expect(usersServiceMock.listUsers).toHaveBeenCalledTimes(1);
  });

  it('POST /users calls create', async () => {
    const dto = {
      email: 'agent@westdrive.fr',
      password: 'StrongPassword123!',
      firstName: 'Agent',
      lastName: 'Ops',
      phone: '+33622334455',
      role: 'CUSTOMER_SUPPORT',
    };
    const expected = { id: '1', email: dto.email };
    usersServiceMock.create.mockResolvedValue(expected);

    await expect(controller.create(dto)).resolves.toEqual(expected);
    expect(usersServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('GET /users/:id calls getById', async () => {
    const expected = { id: '1', email: 'admin@westdrive.fr' };
    usersServiceMock.getById.mockResolvedValue(expected);

    await expect(
      controller.getUserById('f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0'),
    ).resolves.toEqual(expected);
  });

  it('PATCH /users/:id calls update', async () => {
    const userId = 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0';
    const dto = { firstName: 'Updated' };
    const expected = { id: userId, firstName: 'Updated' };
    usersServiceMock.update.mockResolvedValue(expected);

    await expect(controller.updateUser(userId, dto)).resolves.toEqual(expected);
    expect(usersServiceMock.update).toHaveBeenCalledWith(userId, dto);
  });

  it('PATCH /users/:id/status calls updateStatus', async () => {
    const userId = 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0';
    const dto = { status: UserStatus.SUSPENDU };
    const expected = { id: userId, status: UserStatus.SUSPENDU };
    usersServiceMock.updateStatus.mockResolvedValue(expected);

    await expect(controller.updateUserStatus(userId, dto)).resolves.toEqual(
      expected,
    );
    expect(usersServiceMock.updateStatus).toHaveBeenCalledWith(
      userId,
      UserStatus.SUSPENDU,
    );
  });

  it('DELETE /users/:id calls remove', async () => {
    const userId = 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0';
    const expected = { message: 'User deleted successfully' };
    usersServiceMock.remove.mockResolvedValue(expected);

    await expect(controller.removeUser(userId)).resolves.toEqual(expected);
    expect(usersServiceMock.remove).toHaveBeenCalledWith(userId);
  });
});
