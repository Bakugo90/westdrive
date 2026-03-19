import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ConfirmRegisterOtpDto } from './dto/confirm-register-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Demarrer une inscription utilisateur',
    description:
      'Genere et envoie un OTP a 6 chiffres pour confirmer l email avant creation du compte.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    description: 'OTP d inscription genere avec succes.',
    schema: {
      example: {
        message: 'OTP sent',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Payload invalide ou email deja utilise.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.requestRegisterOtp(dto);
  }

  @Post('register/confirm')
  @ApiOperation({
    summary: 'Confirmer inscription avec OTP',
    description:
      'Valide le code OTP puis cree le compte et renvoie les tokens JWT.',
  })
  @ApiBody({ type: ConfirmRegisterOtpDto })
  @ApiOkResponse({
    description: 'Inscription confirmee et tokens JWT emis.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'OTP invalide ou expire.' })
  confirmRegister(@Body() dto: ConfirmRegisterOtpDto) {
    return this.authService.confirmRegisterOtp(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Authentifier un utilisateur',
    description: 'Retourne les tokens JWT si les credentials sont valides.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Authentification reussie.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Credentials invalides.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Renouveler les tokens JWT',
    description: 'Valide le refresh token puis emet une nouvelle paire JWT.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Nouveaux tokens JWT emis.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide.' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Demarrer reinitialisation mot de passe',
    description:
      'Genere un OTP de reinitialisation. La reponse est volontairement generique.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Demande de reinitialisation prise en compte.',
    schema: {
      example: {
        message: 'If this account exists, an OTP has been sent',
      },
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Finaliser reinitialisation mot de passe',
    description: 'Valide OTP puis met a jour le mot de passe.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: 'Mot de passe mis a jour.',
    schema: {
      example: {
        message: 'Password updated successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'OTP invalide ou expire.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
