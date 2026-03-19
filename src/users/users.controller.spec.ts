import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserStatus } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    listUsers: jest.fn(),
    updateStatus: jest.fn(),
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
});
