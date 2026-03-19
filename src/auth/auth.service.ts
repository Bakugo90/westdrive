import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomInt, randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfirmRegisterOtpDto } from './dto/confirm-register-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { IamService } from '../iam/iam.service';
import { AuthOtp, AuthOtpPurpose } from './entities/auth-otp.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly iamService: IamService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(AuthOtp)
    private readonly authOtpRepository: Repository<AuthOtp>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async requestRegisterOtp(dto: RegisterDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    await this.createOtp({
      email,
      purpose: AuthOtpPurpose.REGISTER,
      payload: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? '+33000000000',
      },
      ttlMinutes: this.configService.get<number>(
        'REGISTER_OTP_TTL_MINUTES',
        10,
      ),
    });

    return { message: 'OTP sent' };
  }

  async confirmRegisterOtp(dto: ConfirmRegisterOtpDto): Promise<TokenPair> {
    const email = this.normalizeEmail(dto.email);
    const otpRecord = await this.validateOtp(
      email,
      dto.otp,
      AuthOtpPurpose.REGISTER,
    );

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const payload = otpRecord.payload ?? {};
    const firstName = this.readPayloadString(payload, 'firstName', 'Client');
    const lastName = this.readPayloadString(payload, 'lastName', 'WestDrive');
    const phone = this.readPayloadString(payload, 'phone', '+33000000000');
    const passwordHash = this.readPayloadString(payload, 'passwordHash', '');

    if (!passwordHash) {
      throw new UnauthorizedException('Invalid OTP payload');
    }

    const user = await this.usersService.createUser({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      role: 'CUSTOMER',
    });

    otpRecord.consumedAt = new Date();
    await this.authOtpRepository.save(otpRecord);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIF) {
      throw new UnauthorizedException('User is suspended');
    }

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        jti: string;
      }>(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const currentSession = await this.refreshTokenRepository.findOne({
        where: {
          userId: payload.sub,
          jti: payload.jti,
        },
      });

      if (!currentSession || currentSession.revokedAt) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (currentSession.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const hashMatches = await argon2.verify(
        currentSession.tokenHash,
        dto.refreshToken,
      );

      if (!hashMatches) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || user.status !== UserStatus.ACTIF) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.issueTokens(user, currentSession);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (user) {
      await this.createOtp({
        email,
        purpose: AuthOtpPurpose.RESET_PASSWORD,
        userId: user.id,
        ttlMinutes: this.configService.get<number>(
          'PASSWORD_RESET_OTP_TTL_MINUTES',
          10,
        ),
      });
    }

    return {
      message: 'If this account exists, an OTP has been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const otpRecord = await this.validateOtp(
      email,
      dto.otp,
      AuthOtpPurpose.RESET_PASSWORD,
    );

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.usersService.updatePasswordHash(user.id, passwordHash);

    otpRecord.consumedAt = new Date();
    await this.authOtpRepository.save(otpRecord);

    await this.refreshTokenRepository.update(
      {
        userId: user.id,
        revokedAt: IsNull(),
      },
      {
        revokedAt: new Date(),
      },
    );

    return { message: 'Password updated successfully' };
  }

  private async issueTokens(
    user: User,
    rotatedSession?: RefreshToken,
  ): Promise<TokenPair> {
    const { roles, permissions } = await this.iamService.getUserSecurityContext(
      user.id,
    );

    const accessExpiresIn = this.parseDurationToSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7d'),
    );
    const refreshExpiresIn = this.parseDurationToSeconds(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        roles,
        permissions,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn,
      },
    );

    const refreshJti = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        jti: refreshJti,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      },
    );

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        jti: refreshJti,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
        revokedAt: null,
        replacedByJti: null,
      }),
    );

    if (rotatedSession) {
      rotatedSession.revokedAt = new Date();
      rotatedSession.replacedByJti = refreshJti;
      await this.refreshTokenRepository.save(rotatedSession);
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }

  private async createOtp(options: {
    email: string;
    purpose: AuthOtpPurpose;
    ttlMinutes: number;
    payload?: Record<string, unknown>;
    userId?: string;
  }): Promise<void> {
    await this.authOtpRepository.delete({
      email: options.email,
      purpose: options.purpose,
      consumedAt: IsNull(),
    });

    const otp = this.generateOtpCode();
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + options.ttlMinutes * 60 * 1000);

    await this.authOtpRepository.save(
      this.authOtpRepository.create({
        email: options.email,
        purpose: options.purpose,
        otpHash,
        payload: options.payload ?? null,
        userId: options.userId ?? null,
        expiresAt,
        consumedAt: null,
      }),
    );

    this.logger.log(
      `OTP generated for ${options.purpose} on ${options.email}. Code=${otp}`,
    );
  }

  private async validateOtp(
    email: string,
    otp: string,
    purpose: AuthOtpPurpose,
  ): Promise<AuthOtp> {
    const record = await this.authOtpRepository.findOne({
      where: {
        email,
        purpose,
        consumedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('OTP expired');
    }

    const isValidOtp = await argon2.verify(record.otpHash, otp);
    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    return record;
  }

  private generateOtpCode(): string {
    const fixedOtpEnabled =
      this.configService.get<string>('OTP_FIXED_ENABLED', 'true') === 'true';

    if (fixedOtpEnabled) {
      return this.configService.get<string>('OTP_FIXED_CODE', '123456');
    }

    return randomInt(100000, 1000000).toString();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private readPayloadString(
    payload: Record<string, unknown>,
    key: string,
    fallback: string,
  ): string {
    const value = payload[key];
    return typeof value === 'string' ? value : fallback;
  }

  private parseDurationToSeconds(raw: string): number {
    if (/^\d+$/.test(raw)) {
      const numericSeconds = Number(raw);
      if (numericSeconds > 0) {
        return numericSeconds;
      }
      throw new BadRequestException('Invalid JWT duration value');
    }

    const match = raw.match(/^(\d+)([smhd])$/i);
    if (!match) {
      throw new BadRequestException('Invalid JWT duration format');
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return amount * multipliers[unit];
  }
}
