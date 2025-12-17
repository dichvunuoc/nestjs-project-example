import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { IAppConfig } from './config.interface';

/**
 * Type-safe Configuration Service
 * 
 * Wraps @nestjs/config với type-safe getters
 * 
 * Usage:
 * ```typescript
 * constructor(private readonly config: AppConfigService) {}
 * 
 * const port = this.config.port;
 * const dbUrl = this.config.database.writeUrl;
 * ```
 */
@Injectable()
export class AppConfigService implements IAppConfig {
  constructor(private readonly configService: NestConfigService) {}

  get nodeEnv(): 'development' | 'staging' | 'production' {
    return this.configService.get<'development' | 'staging' | 'production'>(
      'NODE_ENV',
      'development',
    ) as 'development' | 'staging' | 'production';
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get apiPrefix(): string {
    return this.configService.get<string>('API_PREFIX', 'api');
  }

  get database(): IAppConfig['database'] {
    return {
      writeUrl: this.configService.get<string>('DATABASE_URL')!,
      readUrl: this.configService.get<string>('DATABASE_READ_URL'),
      maxConnections: this.configService.get<number>('DATABASE_MAX_CONNECTIONS', 10),
      connectionTimeout: this.configService.get<number>('DATABASE_CONNECTION_TIMEOUT', 5000),
    };
  }

  get redis(): IAppConfig['redis'] {
    return {
      url: this.configService.get<string>('REDIS_URL')!,
      ttl: this.configService.get<number>('REDIS_TTL', 3600),
    };
  }

  get jwt(): IAppConfig['jwt'] | undefined {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) return undefined;

    return {
      secret,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
    };
  }

  get logging(): IAppConfig['logging'] {
    return {
      level: (this.configService.get<string>('LOG_LEVEL', 'info') ||
        'info') as 'error' | 'warn' | 'info' | 'debug' | 'verbose',
    };
  }

  get externalServices(): IAppConfig['externalServices'] {
    // Parse external services from env vars
    // Format: EXTERNAL_SERVICE_<NAME>_URL, EXTERNAL_SERVICE_<NAME>_TIMEOUT, etc.
    const services: IAppConfig['externalServices'] = {};
    const env = process.env;

    // This is a simplified version - can be enhanced
    for (const key in env) {
      if (key.startsWith('EXTERNAL_SERVICE_') && key.endsWith('_URL')) {
        const serviceName = key
          .replace('EXTERNAL_SERVICE_', '')
          .replace('_URL', '')
          .toLowerCase();

        services[serviceName] = {
          baseUrl: env[key]!,
          timeout: parseInt(env[`EXTERNAL_SERVICE_${serviceName.toUpperCase()}_TIMEOUT`] || '5000', 10),
          retry: {
            maxAttempts: parseInt(
              env[`EXTERNAL_SERVICE_${serviceName.toUpperCase()}_RETRY_MAX_ATTEMPTS`] || '3',
              10,
            ),
            delay: parseInt(
              env[`EXTERNAL_SERVICE_${serviceName.toUpperCase()}_RETRY_DELAY`] || '1000',
              10,
            ),
          },
        };
      }
    }

    return Object.keys(services).length > 0 ? services : undefined;
  }

  /**
   * Check if running in production
   */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  /**
   * Check if running in development
   */
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  /**
   * Get raw config value (for advanced use cases)
   */
  getRaw<T = any>(key: string, defaultValue?: T): T | undefined {
    return this.configService.get<T>(key, defaultValue);
  }
}
