/**
 * Configuration Validation Schema
 * 
 * Validates environment variables on application startup
 * Uses simple validation - can be replaced with Joi/Zod if needed
 * 
 * Note: For production, consider using @nestjs/config với Joi validation
 */

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const requiredVars = [
    'DATABASE_URL',
    'REDIS_URL',
  ];

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && !['development', 'staging', 'production'].includes(nodeEnv)) {
    errors.push(
      `Invalid NODE_ENV: ${nodeEnv}. Must be one of: development, staging, production`,
    );
  }

  // Validate PORT
  const port = process.env.PORT;
  if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
    errors.push(`Invalid PORT: ${port}. Must be a number between 1 and 65535`);
  }

  // Validate LOG_LEVEL
  const logLevel = process.env.LOG_LEVEL;
  if (
    logLevel &&
    !['error', 'warn', 'info', 'debug', 'verbose'].includes(logLevel)
  ) {
    errors.push(
      `Invalid LOG_LEVEL: ${logLevel}. Must be one of: error, warn, info, debug, verbose`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate and throw if invalid
 */
export function validateConfigOrThrow(): void {
  const result = validateConfig();
  if (!result.isValid) {
    throw new Error(
      `Configuration validation failed:\n${result.errors.join('\n')}`,
    );
  }
}
