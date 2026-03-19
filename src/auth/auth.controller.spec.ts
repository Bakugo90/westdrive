import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    requestRegisterOtp: jest.fn(),
    confirmRegisterOtp: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('POST /auth/register calls requestRegisterOtp', async () => {
    const dto = {
      email: 'client@westdrive.fr',
      password: 'StrongPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+33612345678',
    };
    const expected = { message: 'OTP sent' };
    authServiceMock.requestRegisterOtp.mockResolvedValue(expected);

    await expect(controller.register(dto)).resolves.toEqual(expected);
    expect(authServiceMock.requestRegisterOtp).toHaveBeenCalledWith(dto);
  });

  it('POST /auth/register/confirm calls confirmRegisterOtp', async () => {
    const dto = { email: 'client@westdrive.fr', otp: '123456' };
    const expected = {
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
    };
    authServiceMock.confirmRegisterOtp.mockResolvedValue(expected);

    await expect(controller.confirmRegister(dto)).resolves.toEqual(expected);
    expect(authServiceMock.confirmRegisterOtp).toHaveBeenCalledWith(dto);
  });

  it('POST /auth/login calls login', async () => {
    const dto = {
      email: 'client@westdrive.fr',
      password: 'StrongPassword123!',
    };
    const expected = {
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
    };
    authServiceMock.login.mockResolvedValue(expected);

    await expect(controller.login(dto)).resolves.toEqual(expected);
    expect(authServiceMock.login).toHaveBeenCalledWith(dto);
  });

  it('POST /auth/refresh calls refresh', async () => {
    const dto = { refreshToken: 'refresh-token' };
    const expected = {
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
      tokenType: 'Bearer',
    };
    authServiceMock.refresh.mockResolvedValue(expected);

    await expect(controller.refresh(dto)).resolves.toEqual(expected);
    expect(authServiceMock.refresh).toHaveBeenCalledWith(dto);
  });

  it('POST /auth/forgot-password calls forgotPassword', async () => {
    const dto = { email: 'client@westdrive.fr' };
    const expected = {
      message: 'If this account exists, an OTP has been sent',
    };
    authServiceMock.forgotPassword.mockResolvedValue(expected);

    await expect(controller.forgotPassword(dto)).resolves.toEqual(expected);
    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('POST /auth/reset-password calls resetPassword', async () => {
    const dto = {
      email: 'client@westdrive.fr',
      otp: '123456',
      newPassword: 'BrandNewPassword123!',
    };
    const expected = { message: 'Password updated successfully' };
    authServiceMock.resetPassword.mockResolvedValue(expected);

    await expect(controller.resetPassword(dto)).resolves.toEqual(expected);
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith(dto);
  });
});
