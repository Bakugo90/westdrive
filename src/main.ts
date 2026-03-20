import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ApiResponseInterceptor } from './shared/interceptors/api-response.interceptor';
import { SanitizeInputPipe } from './shared/pipes/sanitize-input.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const whitelistRaw =
    process.env.CORS_WHITELIST ??
    process.env.CORS_ORIGIN ??
    'http://localhost:3001';

  const corsWhitelist = whitelistRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowNoOrigin =
    (process.env.CORS_ALLOW_NO_ORIGIN ?? 'true').toLowerCase() === 'true';

  const methodsRaw =
    process.env.CORS_METHODS ?? 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
  const corsMethods = methodsRaw
    .split(',')
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean);

  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, allowNoOrigin);
        return;
      }

      const isAllowed = corsWhitelist.includes(origin);
      callback(null, isAllowed);
    },
    methods: corsMethods,
    credentials: true,
  });
  // Enforce strict DTO contracts at the application boundary.
  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('WestDrive Backend API')
    .setDescription('Core backend API for WestDrive rental operations')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
