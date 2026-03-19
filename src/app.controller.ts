import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Endpoint de ping applicatif',
    description: 'Permet de verifier rapidement que l API repond.',
  })
  @ApiOkResponse({
    description: 'API disponible.',
    schema: { example: 'Hello World!' },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Healthcheck applicatif',
    description: 'Retourne l etat de disponibilite du service API.',
  })
  @ApiOkResponse({
    description: 'Service disponible.',
    schema: { example: { status: 'ok' } },
  })
  health() {
    return this.appService.health();
  }
}
