import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@core/common';
import { ResponseInterceptor } from '@core/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Enable graceful shutdown hooks
  // This allows NestJS to properly close database connections on shutdown
  app.enableShutdownHooks();

  // Global Exception Filter - handles all exceptions
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor - standardizes all responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
