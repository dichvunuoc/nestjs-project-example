if (process.env.NODE_ENV !== 'production' && !process.env.SKIP_TSCONFIG_PATHS) {
  try {
    require('tsconfig-paths/register');
  } catch (e) {
    // Ignore error if not found or failing in non-dev env
  }
}
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  GlobalExceptionFilter,
  ResponseInterceptor,
  GlobalValidationPipe,
} from 'src/libs/shared/http';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  // Use Pino logger for all NestJS logging
  app.useLogger(app.get(Logger));

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Global Validation Pipe - validates and transforms DTOs
  app.useGlobalPipes(GlobalValidationPipe);

  // Global Exception Filter - handles all exceptions
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor - standardizes all responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS DDD/CQRS API')
    .setDescription(
      `
## Overview
This API demonstrates Domain-Driven Design (DDD) and CQRS patterns in NestJS.

## Architecture
- **Domain Layer**: Pure TypeScript entities, value objects, domain events
- **Application Layer**: Commands, Queries, Handlers (CQRS)
- **Infrastructure Layer**: Repositories, DAOs, Controllers

## Features
- Aggregate Root pattern with Optimistic Concurrency Control
- Event-driven architecture with Transactional Outbox Pattern
- Read/Write separation (CQRS)
- Request correlation for distributed tracing
- Rate limiting and validation

## Authentication
Currently, this demo API does not require authentication.
In production, add Bearer token authentication.
    `,
    )
    .setVersion('1.0')
    .addTag('products', 'Product management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Idempotency-Key',
        in: 'header',
        description: 'Idempotency key for safe retries',
      },
      'Idempotency-Key',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Correlation-Id',
        in: 'header',
        description: 'Correlation ID for distributed tracing',
      },
      'Correlation-Id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'NestJS DDD/CQRS API Docs',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`Application is running on: http://0.0.0.0:${port}`);
  logger.log(`Swagger docs available at: http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
