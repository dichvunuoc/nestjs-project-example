import {
  ValidationPipe,
  ValidationPipeOptions,
  BadRequestException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Custom Validation Exception Factory
 *
 * Transforms validation errors into a structured format
 * that matches our API response standards
 */
function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const formatErrors = (
    errors: ValidationError[],
    parentPath = '',
  ): Record<string, string[]> => {
    const result: Record<string, string[]> = {};

    for (const error of errors) {
      const propertyPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.constraints) {
        result[propertyPath] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        const childErrors = formatErrors(error.children, propertyPath);
        Object.assign(result, childErrors);
      }
    }

    return result;
  };

  const formattedErrors = formatErrors(errors);

  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: formattedErrors,
  });
}

/**
 * Default validation pipe options
 */
export const defaultValidationOptions: ValidationPipeOptions = {
  /**
   * Strip properties that don't have decorators
   * Prevents unknown fields from being processed
   */
  whitelist: true,

  /**
   * Throw error if non-whitelisted properties are present
   * Helps catch API misuse early
   */
  forbidNonWhitelisted: true,

  /**
   * Auto-transform payloads to DTO instances
   * Enables type coercion (string "1" -> number 1)
   */
  transform: true,

  /**
   * Enable implicit type conversion during transformation
   */
  transformOptions: {
    enableImplicitConversion: true,
  },

  /**
   * Custom exception factory for structured error responses
   */
  exceptionFactory: validationExceptionFactory,
};

/**
 * Global Validation Pipe
 *
 * Pre-configured ValidationPipe for use across the application.
 * Uses class-validator for validation and class-transformer for transformation.
 *
 * Features:
 * - Whitelist: Only decorated properties are allowed
 * - Forbid Non-Whitelisted: Rejects requests with unknown properties
 * - Transform: Converts plain objects to DTO class instances
 * - Structured Error Response: Returns validation errors in consistent format
 *
 * Usage in main.ts:
 * ```typescript
 * app.useGlobalPipes(GlobalValidationPipe);
 * ```
 *
 * Or with custom options:
 * ```typescript
 * app.useGlobalPipes(createValidationPipe({ whitelist: false }));
 * ```
 */
export const GlobalValidationPipe = new ValidationPipe(
  defaultValidationOptions,
);

/**
 * Create a custom validation pipe with merged options
 *
 * @param options Custom options to override defaults
 * @returns Configured ValidationPipe instance
 */
export function createValidationPipe(
  options?: Partial<ValidationPipeOptions>,
): ValidationPipe {
  return new ValidationPipe({
    ...defaultValidationOptions,
    ...options,
  });
}
