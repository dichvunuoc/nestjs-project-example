import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypedConfigService } from './config.service';
import { AppConfigSchema } from './app.config.schema';
import { DatabaseConfigSchema } from './database.config.schema';
import { RedisConfigSchema } from './redis.config.schema';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Configuration validation function
 */
async function validateConfig(config: Record<string, unknown>) {
  const errors: string[] = [];

  // Validate App Config
  const appConfig = plainToInstance(AppConfigSchema, config);
  const appErrors = await validate(appConfig);
  if (appErrors.length > 0) {
    errors.push(...appErrors.map(e => `AppConfig: ${Object.values(e.constraints || {}).join(', ')}`));
  }

  // Validate Database Config (only if DATABASE_URL is not provided)
  if (!config.DATABASE_URL) {
    const dbConfig = plainToInstance(DatabaseConfigSchema, config);
    const dbErrors = await validate(dbConfig);
    if (dbErrors.length > 0) {
      errors.push(...dbErrors.map(e => `DatabaseConfig: ${Object.values(e.constraints || {}).join(', ')}`));
    }
  }

  // Validate Redis Config
  const redisConfig = plainToInstance(RedisConfigSchema, config);
  const redisErrors = await validate(redisConfig);
  if (redisErrors.length > 0) {
    errors.push(...redisErrors.map(e => `RedisConfig: ${Object.values(e.constraints || {}).join(', ')}`));
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return config;
}

/**
 * Configuration Module
 * 
 * Provides typed configuration với validation
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      validationOptions: {
        allowUnknown: true, // Allow unknown env vars
        abortEarly: false, // Report all errors
      },
    }),
  ],
  providers: [TypedConfigService],
  exports: [TypedConfigService],
})
export class ConfigModule {}
