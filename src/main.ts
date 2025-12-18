import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import {
  GlobalExceptionFilter,
  ResponseInterceptor,
  GlobalValidationPipe,
} from '@core/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      // Disable default logger, we'll use Pino
      bufferLogs: true,
    },
  );

  // Use Pino logger for all NestJS logging
  app.useLogger(app.get(Logger));

  // Enable graceful shutdown hooks
  // This allows NestJS to properly close database connections on shutdown
  app.enableShutdownHooks();

  // Global Validation Pipe - validates and transforms DTOs
  app.useGlobalPipes(GlobalValidationPipe);

  // Global Exception Filter - handles all exceptions
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor - standardizes all responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
