import * as Joi from 'joi';

/**
 * Configuration Schema using Joi
 * Validates environment variables on application startup
 * Fails fast if configuration is invalid
 */
export const configSchema = Joi.object({
  // Application
  APP_NAME: Joi.string().default('nestjs-project-example'),
  APP_VERSION: Joi.string().default('0.0.1'),
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  GLOBAL_PREFIX: Joi.string().optional(),

  // Database - Write
  DB_WRITE_HOST: Joi.string().required(),
  DB_WRITE_PORT: Joi.number().port().default(5432),
  DB_WRITE_DATABASE: Joi.string().required(),
  DB_WRITE_USERNAME: Joi.string().required(),
  DB_WRITE_PASSWORD: Joi.string().required(),
  DB_WRITE_SSL: Joi.boolean().default(false),
  DB_WRITE_MAX_CONNECTIONS: Joi.number().integer().min(1).optional(),

  // Database - Read (optional)
  DB_READ_HOST: Joi.string().optional(),
  DB_READ_PORT: Joi.number().port().optional(),
  DB_READ_DATABASE: Joi.string().optional(),
  DB_READ_USERNAME: Joi.string().optional(),
  DB_READ_PASSWORD: Joi.string().optional(),
  DB_READ_SSL: Joi.boolean().optional(),
  DB_READ_MAX_CONNECTIONS: Joi.number().integer().min(1).optional(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_TTL: Joi.number().integer().min(0).optional(),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Observability - Metrics
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PATH: Joi.string().default('/metrics'),

  // Observability - Tracing
  TRACING_ENABLED: Joi.boolean().default(false),
  TRACING_SERVICE_NAME: Joi.string().default('nestjs-project-example'),
  TRACING_EXPORTER: Joi.string()
    .valid('jaeger', 'zipkin', 'console')
    .default('console'),
  TRACING_ENDPOINT: Joi.string().uri().optional(),

  // Event Bus
  EVENT_BUS_TYPE: Joi.string()
    .valid('in-memory', 'rabbitmq', 'kafka')
    .default('in-memory'),
  RABBITMQ_URL: Joi.string().uri().optional(),
  RABBITMQ_EXCHANGE: Joi.string().optional(),
  KAFKA_BROKERS: Joi.string().optional(), // Comma-separated list
  KAFKA_CLIENT_ID: Joi.string().optional(),

  // Resilience - Circuit Breaker
  CIRCUIT_BREAKER_ENABLED: Joi.boolean().default(true),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .default(5),
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().integer().min(1000).default(60000),
  CIRCUIT_BREAKER_RESET_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(30000),

  // Resilience - Retry
  RETRY_MAX_ATTEMPTS: Joi.number().integer().min(1).default(3),
  RETRY_INITIAL_DELAY: Joi.number().integer().min(0).default(1000),
  RETRY_MAX_DELAY: Joi.number().integer().min(1000).default(30000),
  RETRY_BACKOFF_MULTIPLIER: Joi.number().min(1).default(2),
}).unknown(false); // Reject unknown environment variables
