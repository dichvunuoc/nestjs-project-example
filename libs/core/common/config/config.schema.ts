import * as Joi from 'joi';

/**
 * Configuration Schema using Joi
 *
 * Validates environment variables at application startup
 * Throws error if required variables are missing or invalid
 */
export const configSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('nestjs-project-example'),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_WRITE_URL: Joi.string().optional(),
  DATABASE_READ_URL: Joi.string().optional(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().default(0),
  REDIS_URL: Joi.string().optional(),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  LOG_PRETTY_PRINT: Joi.boolean().default(false),

  // Observability
  ENABLE_TRACING: Joi.boolean().default(false),
  TRACING_SERVICE_NAME: Joi.string().default('nestjs-service'),
  TRACING_EXPORTER_URL: Joi.string().optional(),
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),

  // Message Queue (Optional)
  RABBITMQ_URL: Joi.string().optional(),
  KAFKA_BROKERS: Joi.string().optional(),

  // Security
  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.boolean().default(false),
});
