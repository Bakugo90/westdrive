import { Test, TestingModule } from '@nestjs/testing';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';

describe('IamController', () => {
  let controller: IamController;

  const iamServiceMock = {
    listPermissions: jest.fn(),
    listRoles: jest.fn(),
    createRole: jest.fn(),
    updateRolePermissions: jest.fn(),
    assignRoleToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IamController],
      providers: [
        {
          provide: IamService,
          useValue: iamServiceMock,
        },
      ],
    }).compile();

    controller = module.get<IamController>(IamController);
  });

  it('GET /iam/permissions calls listPermissions', async () => {
    const expected = [{ code: 'roles.read' }];
    iamServiceMock.listPermissions.mockResolvedValue(expected);

    await expect(controller.listPermissions()).resolves.toEqual(expected);
    expect(iamServiceMock.listPermissions).toHaveBeenCalledTimes(1);
  });

  it('GET /iam/roles calls listRoles', async () => {
    const expected = [{ name: 'ADMIN' }];
    iamServiceMock.listRoles.mockResolvedValue(expected);

    await expect(controller.listRoles()).resolves.toEqual(expected);
    expect(iamServiceMock.listRoles).toHaveBeenCalledTimes(1);
  });

  it('POST /iam/roles calls createRole', async () => {
    const dto = {
      name: 'FLEET_MANAGER',
      description: 'Fleet manager role',
      permissionCodes: ['fleet.read', 'fleet.write'],
    };
    const expected = { id: 'role-id', ...dto };
    iamServiceMock.createRole.mockResolvedValue(expected);

    await expect(controller.createRole(dto)).resolves.toEqual(expected);
    expect(iamServiceMock.createRole).toHaveBeenCalledWith(dto);
  });

  it('PATCH /iam/roles/:roleId/permissions calls updateRolePermissions', async () => {
    const roleId = '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688';
    const dto = { permissionCodes: ['users.read'] };
    const expected = { id: roleId, permissionCodes: dto.permissionCodes };
    iamServiceMock.updateRolePermissions.mockResolvedValue(expected);

    await expect(
      controller.updateRolePermissions(roleId, dto),
    ).resolves.toEqual(expected);
    expect(iamServiceMock.updateRolePermissions).toHaveBeenCalledWith(
      roleId,
      dto,
    );
  });

  it('POST /iam/roles/:roleId/users/:userId calls assignRoleToUser', async () => {
    const roleId = '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688';
    const userId = 'f7c3084e-6a3b-4dcf-a9f2-b6dbfae436c0';
    const expected = { id: 'link-id', roleId, userId };
    iamServiceMock.assignRoleToUser.mockResolvedValue(expected);

    await expect(controller.assignRoleToUser(roleId, userId)).resolves.toEqual(
      expected,
    );
    expect(iamServiceMock.assignRoleToUser).toHaveBeenCalledWith(
      roleId,
      userId,
    );
  });
});
