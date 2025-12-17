/**
 * Type-safe Configuration Interface
 *
 * Maps environment variables to typed configuration object
 */
export interface AppConfig {
  // Application
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  appName: string;

  // Database
  database: {
    url: string;
    writeUrl?: string;
    readUrl?: string;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    url?: string;
  };

  // Logging
  logging: {
    level: string;
    prettyPrint: boolean;
  };

  // Observability
  observability: {
    tracing: {
      enabled: boolean;
      serviceName: string;
      exporterUrl?: string;
    };
    metrics: {
      enabled: boolean;
      port: number;
    };
  };

  // Message Queue
  messaging: {
    rabbitmq?: {
      url: string;
    };
    kafka?: {
      brokers: string[];
    };
  };

  // Security
  security: {
    jwt?: {
      secret: string;
      expiresIn: string;
    };
  };

  // CORS
  cors: {
    origin: string;
    credentials: boolean;
  };
}
