import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { configSchema } from './config.schema';

/**
 * Configuration Module
 * Provides validated, type-safe configuration
 * Global module - available throughout the application
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: {
        allowUnknown: false, // Reject unknown environment variables
        abortEarly: true, // Stop validation on first error
      },
      // Load from .env file
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService, NestConfigModule],
})
export class ConfigModule {}
