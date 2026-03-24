import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly enabled: boolean;
  private readonly transporter: Transporter | null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('MAIL_ENABLED', 'false') === 'true';
    this.fromEmail = this.configService.get<string>(
      'MAIL_FROM_EMAIL',
      'noreply@westdrive.fr',
    );
    this.fromName = this.configService.get<string>(
      'MAIL_FROM_NAME',
      'WestDrive',
    );

    if (!this.enabled) {
      this.transporter = null;
      return;
    }

    const host = this.configService.get<string>('MAIL_HOST');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');
    const port = Number(this.configService.get<string>('MAIL_PORT', '465'));
    const secure =
      this.configService.get<string>('MAIL_SECURE', 'true') === 'true';
    const connectionTimeout = Number(
      this.configService.get<string>('MAIL_CONNECTION_TIMEOUT_MS', '10000'),
    );
    const greetingTimeout = Number(
      this.configService.get<string>('MAIL_GREETING_TIMEOUT_MS', '10000'),
    );
    const socketTimeout = Number(
      this.configService.get<string>('MAIL_SOCKET_TIMEOUT_MS', '20000'),
    );

    if (!host || !user || !pass) {
      throw new Error(
        'MAIL_HOST, MAIL_USER and MAIL_PASSWORD are required when MAIL_ENABLED=true',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendOtpEmail(options: {
    to: string;
    otpCode: string;
    purpose: 'register' | 'reset-password';
    ttlMinutes: number;
  }): Promise<void> {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(
        `Email sending disabled. OTP for ${options.to} not sent by SMTP.`,
      );
      return;
    }

    const subject =
      options.purpose === 'register'
        ? 'WestDrive - Confirmation de votre inscription'
        : 'WestDrive - Reinitialisation de mot de passe';

    const actionText =
      options.purpose === 'register'
        ? 'confirmer votre inscription'
        : 'reinitialiser votre mot de passe';

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin-bottom: 8px;">WestDrive</h2>
        <p>Bonjour,</p>
        <p>Utilisez le code suivant pour ${actionText}:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${options.otpCode}</p>
        <p>Ce code expire dans ${options.ttlMinutes} minutes.</p>
        <p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
      </div>
    `;

    const text = [
      'WestDrive',
      '',
      `Code OTP: ${options.otpCode}`,
      `Validite: ${options.ttlMinutes} minutes`,
    ].join('\n');

    let info: unknown;

    try {
      info = await this.transporter.sendMail({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown SMTP error';
      this.logger.error(`Failed to send OTP email to ${options.to}: ${reason}`);
      throw new Error(`OTP email delivery failed: ${reason}`);
    }

    const messageId = this.readMessageId(info);

    this.logger.log(`OTP email sent to ${options.to}. messageId=${messageId}`);
  }

  private readMessageId(info: unknown): string {
    if (
      typeof info === 'object' &&
      info !== null &&
      'messageId' in info &&
      typeof info.messageId === 'string'
    ) {
      return info.messageId;
    }

    return 'unknown';
  }
}
