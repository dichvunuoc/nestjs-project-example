/**
 * Application Configuration Interface
 * Type-safe configuration for the entire application
 */
export interface AppConfig {
  // Application
  app: {
    name: string;
    version: string;
    port: number;
    env: 'development' | 'staging' | 'production';
    globalPrefix?: string;
  };

  // Database
  database: {
    write: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      ssl?: boolean;
      maxConnections?: number;
    };
    read?: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      ssl?: boolean;
      maxConnections?: number;
    };
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    ttl?: number;
  };

  // Logging
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    pretty?: boolean;
  };

  // Observability
  observability?: {
    metrics?: {
      enabled: boolean;
      path?: string;
    };
    tracing?: {
      enabled: boolean;
      serviceName?: string;
      exporter?: 'jaeger' | 'zipkin' | 'console';
      endpoint?: string;
    };
  };

  // Event Bus
  eventBus?: {
    type: 'in-memory' | 'rabbitmq' | 'kafka';
    rabbitmq?: {
      url: string;
      exchange?: string;
    };
    kafka?: {
      brokers: string[];
      clientId?: string;
    };
  };

  // Resilience
  resilience?: {
    circuitBreaker?: {
      enabled: boolean;
      failureThreshold?: number;
      timeout?: number;
      resetTimeout?: number;
    };
    retry?: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    };
  };
}
