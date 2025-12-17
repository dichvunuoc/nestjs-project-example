import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AppConfig } from './config.interface';

/**
 * Type-safe Configuration Service
 *
 * Provides typed access to configuration values
 * with validation at startup
 */
@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  /**
   * Get full configuration object
   */
  get config(): AppConfig {
    return {
      nodeEnv: this.nestConfigService.get<'development' | 'production' | 'test'>(
        'NODE_ENV',
        'development',
      ),
      port: this.nestConfigService.get<number>('PORT', 3000),
      appName: this.nestConfigService.get<string>(
        'APP_NAME',
        'nestjs-project-example',
      ),
      database: {
        url: this.nestConfigService.get<string>('DATABASE_URL', ''),
        writeUrl: this.nestConfigService.get<string>('DATABASE_WRITE_URL'),
        readUrl: this.nestConfigService.get<string>('DATABASE_READ_URL'),
      },
      redis: {
        host: this.nestConfigService.get<string>('REDIS_HOST', 'localhost'),
        port: this.nestConfigService.get<number>('REDIS_PORT', 6379),
        password: this.nestConfigService.get<string>('REDIS_PASSWORD'),
        db: this.nestConfigService.get<number>('REDIS_DB', 0),
        url: this.nestConfigService.get<string>('REDIS_URL'),
      },
      logging: {
        level: this.nestConfigService.get<string>('LOG_LEVEL', 'info'),
        prettyPrint: this.nestConfigService.get<boolean>(
          'LOG_PRETTY_PRINT',
          false,
        ),
      },
      observability: {
        tracing: {
          enabled: this.nestConfigService.get<boolean>(
            'ENABLE_TRACING',
            false,
          ),
          serviceName: this.nestConfigService.get<string>(
            'TRACING_SERVICE_NAME',
            'nestjs-service',
          ),
          exporterUrl: this.nestConfigService.get<string>(
            'TRACING_EXPORTER_URL',
          ),
        },
        metrics: {
          enabled: this.nestConfigService.get<boolean>(
            'ENABLE_METRICS',
            true,
          ),
          port: this.nestConfigService.get<number>('METRICS_PORT', 9090),
        },
      },
      messaging: {
        rabbitmq: this.nestConfigService.get<string>('RABBITMQ_URL')
          ? {
              url: this.nestConfigService.get<string>('RABBITMQ_URL')!,
            }
          : undefined,
        kafka: this.nestConfigService.get<string>('KAFKA_BROKERS')
          ? {
              brokers: this.nestConfigService
                .get<string>('KAFKA_BROKERS')!
                .split(','),
            }
          : undefined,
      },
      security: {
        jwt: this.nestConfigService.get<string>('JWT_SECRET')
          ? {
              secret: this.nestConfigService.get<string>('JWT_SECRET')!,
              expiresIn: this.nestConfigService.get<string>(
                'JWT_EXPIRES_IN',
                '1h',
              ),
            }
          : undefined,
      },
      cors: {
        origin: this.nestConfigService.get<string>('CORS_ORIGIN', '*'),
        credentials: this.nestConfigService.get<boolean>(
          'CORS_CREDENTIALS',
          false,
        ),
      },
    };
  }

  /**
   * Get environment
   */
  get nodeEnv(): 'development' | 'production' | 'test' {
    return this.config.nodeEnv;
  }

  /**
   * Check if development mode
   */
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  /**
   * Check if production mode
   */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  /**
   * Get database URL
   */
  get databaseUrl(): string {
    return this.config.database.url;
  }

  /**
   * Get Redis URL
   */
  get redisUrl(): string | undefined {
    return this.config.redis.url;
  }
}
