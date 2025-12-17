/**
 * Configuration Interface
 * 
 * Type-safe configuration interface cho application
 */
export interface IAppConfig {
  // Application
  nodeEnv: 'development' | 'staging' | 'production';
  port: number;
  apiPrefix: string;

  // Database
  database: {
    writeUrl: string;
    readUrl?: string;
    maxConnections?: number;
    connectionTimeout?: number;
  };

  // Redis
  redis: {
    url: string;
    ttl?: number;
  };

  // JWT (if needed)
  jwt?: {
    secret: string;
    expiresIn: string;
  };

  // Logging
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  };

  // External Services (optional)
  externalServices?: {
    [key: string]: {
      baseUrl: string;
      timeout?: number;
      retry?: {
        maxAttempts: number;
        delay: number;
      };
    };
  };
}
