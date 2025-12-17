import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { configSchema } from './config.schema';

/**
 * Configuration Module
 *
 * Provides type-safe configuration with validation
 * Validates environment variables at startup using Joi schema
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: {
        allowUnknown: true, // Allow unknown env vars
        abortEarly: false, // Report all validation errors
      },
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
