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
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Creer un nouveau compte utilisateur',
    description:
      'Inscrit un utilisateur standard et renvoie une paire access/refresh token.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    description: 'Compte cree avec succes et tokens JWT emis.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Payload invalide ou email deja utilise.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
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
}
