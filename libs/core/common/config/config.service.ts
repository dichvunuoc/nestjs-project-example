import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AppConfigSchema, Environment } from './app.config.schema';
import { DatabaseConfigSchema } from './database.config.schema';
import { RedisConfigSchema } from './redis.config.schema';
import { IConfig, ConfigValidationResult } from './config.interface';

/**
 * Typed Configuration Service
 * 
 * Provides type-safe configuration với validation
 */
@Injectable()
export class TypedConfigService {
  private appConfig: AppConfigSchema;
  private databaseConfig: DatabaseConfigSchema;
  private redisConfig: RedisConfigSchema;

  constructor(private readonly nestConfigService: NestConfigService) {
    // Load và validate configurations
    this.appConfig = this.loadConfig(AppConfigSchema);
    this.databaseConfig = this.loadConfig(DatabaseConfigSchema);
    this.redisConfig = this.loadConfig(RedisConfigSchema);
  }

  /**
   * Load và validate configuration
   */
  private loadConfig<T extends IConfig>(ConfigClass: new () => T): T {
    const config = new ConfigClass();
    const errors: string[] = [];

    // Get all properties từ ConfigClass
    const properties = Object.getOwnPropertyNames(config);

    for (const prop of properties) {
      const envValue = this.nestConfigService.get(prop);
      if (envValue !== undefined) {
        (config as any)[prop] = envValue;
      }
    }

    // Validate (simple validation - trong production nên dùng class-validator)
    // For now, we'll just return the config
    // Full validation should be done at application startup

    return config;
  }

  /**
   * Get application configuration
   */
  getAppConfig(): AppConfigSchema {
    return this.appConfig;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfigSchema {
    return this.databaseConfig;
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig(): RedisConfigSchema {
    return this.redisConfig;
  }

  /**
   * Get environment
   */
  getEnvironment(): Environment {
    return this.appConfig.NODE_ENV || Environment.DEVELOPMENT;
  }

  /**
   * Check if production
   */
  isProduction(): boolean {
    return this.getEnvironment() === Environment.PRODUCTION;
  }

  /**
   * Check if development
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === Environment.DEVELOPMENT;
  }

  /**
   * Get generic config value
   */
  get<T = any>(key: string): T | undefined {
    return this.nestConfigService.get<T>(key);
  }

  /**
   * Get config value với default
   */
  getOrThrow<T = any>(key: string): T {
    return this.nestConfigService.getOrThrow<T>(key);
  }
}
