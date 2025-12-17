import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AppConfig } from './config.interface';

/**
 * Configuration Service
 * Provides type-safe access to application configuration
 * Wraps @nestjs/config ConfigService with typed interface
 */
@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  /**
   * Get full application configuration
   */
  getConfig(): AppConfig {
    return {
      app: {
        name: this.nestConfigService.get<string>('APP_NAME', 'nestjs-project-example'),
        version: this.nestConfigService.get<string>('APP_VERSION', '0.0.1'),
        port: this.nestConfigService.get<number>('PORT', 3000),
        env: this.nestConfigService.get<'development' | 'staging' | 'production'>(
          'NODE_ENV',
          'development',
        ),
        globalPrefix: this.nestConfigService.get<string>('GLOBAL_PREFIX'),
      },
      database: {
        write: {
          host: this.nestConfigService.get<string>('DB_WRITE_HOST')!,
          port: this.nestConfigService.get<number>('DB_WRITE_PORT', 5432),
          database: this.nestConfigService.get<string>('DB_WRITE_DATABASE')!,
          username: this.nestConfigService.get<string>('DB_WRITE_USERNAME')!,
          password: this.nestConfigService.get<string>('DB_WRITE_PASSWORD')!,
          ssl: this.nestConfigService.get<boolean>('DB_WRITE_SSL', false),
          maxConnections: this.nestConfigService.get<number>('DB_WRITE_MAX_CONNECTIONS'),
        },
        read: this.nestConfigService.get<string>('DB_READ_HOST')
          ? {
              host: this.nestConfigService.get<string>('DB_READ_HOST')!,
              port: this.nestConfigService.get<number>('DB_READ_PORT', 5432),
              database: this.nestConfigService.get<string>('DB_READ_DATABASE')!,
              username: this.nestConfigService.get<string>('DB_READ_USERNAME')!,
              password: this.nestConfigService.get<string>('DB_READ_PASSWORD')!,
              ssl: this.nestConfigService.get<boolean>('DB_READ_SSL', false),
              maxConnections: this.nestConfigService.get<number>('DB_READ_MAX_CONNECTIONS'),
            }
          : undefined,
      },
      redis: {
        host: this.nestConfigService.get<string>('REDIS_HOST', 'localhost'),
        port: this.nestConfigService.get<number>('REDIS_PORT', 6379),
        password: this.nestConfigService.get<string>('REDIS_PASSWORD'),
        db: this.nestConfigService.get<number>('REDIS_DB', 0),
        ttl: this.nestConfigService.get<number>('REDIS_TTL'),
      },
      logging: {
        level: this.nestConfigService.get<'error' | 'warn' | 'info' | 'debug' | 'verbose'>(
          'LOG_LEVEL',
          'info',
        ),
      },
      observability: {
        metrics: {
          enabled: this.nestConfigService.get<boolean>('METRICS_ENABLED', true),
          path: this.nestConfigService.get<string>('METRICS_PATH', '/metrics'),
        },
        tracing: {
          enabled: this.nestConfigService.get<boolean>('TRACING_ENABLED', false),
          serviceName: this.nestConfigService.get<string>(
            'TRACING_SERVICE_NAME',
            'nestjs-project-example',
          ),
          exporter: this.nestConfigService.get<'jaeger' | 'zipkin' | 'console'>(
            'TRACING_EXPORTER',
            'console',
          ),
          endpoint: this.nestConfigService.get<string>('TRACING_ENDPOINT'),
        },
      },
      eventBus: {
        type: this.nestConfigService.get<'in-memory' | 'rabbitmq' | 'kafka'>(
          'EVENT_BUS_TYPE',
          'in-memory',
        ),
        rabbitmq: this.nestConfigService.get<string>('RABBITMQ_URL')
          ? {
              url: this.nestConfigService.get<string>('RABBITMQ_URL')!,
              exchange: this.nestConfigService.get<string>('RABBITMQ_EXCHANGE'),
            }
          : undefined,
        kafka: this.nestConfigService.get<string>('KAFKA_BROKERS')
          ? {
              brokers: this.nestConfigService.get<string>('KAFKA_BROKERS')!.split(','),
              clientId: this.nestConfigService.get<string>('KAFKA_CLIENT_ID'),
            }
          : undefined,
      },
      resilience: {
        circuitBreaker: {
          enabled: this.nestConfigService.get<boolean>('CIRCUIT_BREAKER_ENABLED', true),
          failureThreshold: this.nestConfigService.get<number>(
            'CIRCUIT_BREAKER_FAILURE_THRESHOLD',
            5,
          ),
          timeout: this.nestConfigService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000),
          resetTimeout: this.nestConfigService.get<number>(
            'CIRCUIT_BREAKER_RESET_TIMEOUT',
            30000,
          ),
        },
        retry: {
          maxAttempts: this.nestConfigService.get<number>('RETRY_MAX_ATTEMPTS', 3),
          initialDelay: this.nestConfigService.get<number>('RETRY_INITIAL_DELAY', 1000),
          maxDelay: this.nestConfigService.get<number>('RETRY_MAX_DELAY', 30000),
          backoffMultiplier: this.nestConfigService.get<number>(
            'RETRY_BACKOFF_MULTIPLIER',
            2,
          ),
        },
      },
    };
  }

  /**
   * Get app configuration
   */
  getAppConfig() {
    return this.getConfig().app;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return this.getConfig().database;
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    return this.getConfig().redis;
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return this.getConfig().logging;
  }

  /**
   * Get observability configuration
   */
  getObservabilityConfig() {
    return this.getConfig().observability;
  }

  /**
   * Get event bus configuration
   */
  getEventBusConfig() {
    return this.getConfig().eventBus;
  }

  /**
   * Get resilience configuration
   */
  getResilienceConfig() {
    return this.getConfig().resilience;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.getAppConfig().env === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.getAppConfig().env === 'development';
  }
}
