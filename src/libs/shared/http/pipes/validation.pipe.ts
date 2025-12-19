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
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory: validationExceptionFactory,
};

/**
 * Global Validation Pipe
 */
export const GlobalValidationPipe = new ValidationPipe(
  defaultValidationOptions,
);

/**
 * Create a custom validation pipe with merged options
 */
export function createValidationPipe(
  options?: Partial<ValidationPipeOptions>,
): ValidationPipe {
  return new ValidationPipe({
    ...defaultValidationOptions,
    ...options,
  });
}
