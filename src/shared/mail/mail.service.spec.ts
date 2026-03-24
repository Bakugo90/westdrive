import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('MailService', () => {
  const sendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('should not send email when MAIL_ENABLED is false', async () => {
    const configService = {
      get: (key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          MAIL_ENABLED: 'false',
        };
        return map[key] ?? defaultValue;
      },
    } as unknown as ConfigService;

    const service = new MailService(configService);

    await service.sendOtpEmail({
      to: 'client@westdrive.fr',
      otpCode: '123456',
      purpose: 'register',
      ttlMinutes: 10,
    });

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('should send OTP email when MAIL_ENABLED is true', async () => {
    sendMail.mockResolvedValue({ messageId: 'message-id-1' });

    const configService = {
      get: (key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          MAIL_ENABLED: 'true',
          MAIL_HOST: 'smtp.hostinger.com',
          MAIL_USER: 'noreply@westdrive.fr',
          MAIL_PASSWORD: 'secret',
          MAIL_PORT: '587',
          MAIL_SECURE: 'false',
          MAIL_FROM_EMAIL: 'noreply@westdrive.fr',
          MAIL_FROM_NAME: 'WestDrive',
        };
        return map[key] ?? defaultValue;
      },
    } as unknown as ConfigService;

    const service = new MailService(configService);

    await service.sendOtpEmail({
      to: 'client@westdrive.fr',
      otpCode: '654321',
      purpose: 'reset-password',
      ttlMinutes: 10,
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.hostinger.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: 'noreply@westdrive.fr',
          pass: 'secret',
        },
      }),
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@westdrive.fr',
        subject: 'WestDrive - Reinitialisation de mot de passe',
      }),
    );
  });
});
