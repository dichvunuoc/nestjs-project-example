import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  SetMetadata,
  Inject,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { StructuredLogger } from '../observability/structured-logger.service';
import { VALIDATION_SCHEMA_KEY } from '../security/decorators';

/**
 * Zod Validation Decorator
 *
 * Attach validation schema to route handlers for automatic validation.
 *
 * Usage:
 * ```typescript
 * @ValidateSchema(CreateProductSchema)
 * @Post('products')
 * async createProduct(@Body() dto: CreateProductDto) {
 *   // DTO will be automatically validated
 * }
 * ```
 */
export const ValidateSchema = (schema: ZodSchema) =>
  SetMetadata(VALIDATION_SCHEMA_KEY, schema);

/**
 * Zod Validation Pipe
 *
 * Automatically validates incoming request bodies using Zod schemas.
 * Transforms data according to schema and provides detailed error messages.
 *
 * Features:
 * - Schema-based validation with Zod
 * - Automatic data transformation
 * - Detailed error messages
 * - Type safety
 * - Custom error formatting
 * - Structured logging of validation failures
 *
 * Usage:
 * ```typescript
 * // Global pipe
 * app.useGlobalPipes(new ZodValidationPipe());
 *
 * // Method-specific schema
 * @ValidateSchema(UserRegistrationSchema)
 * @Post('users')
 * async register(@Body() userDto: UserDto) {
 *   // Validated and transformed data
 * }
 * ```
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly logger: StructuredLogger,
    private options: {
      /**
       * Whether to transform data according to schema
       */
      transform?: boolean;

      /**
       * Whether to enable detailed error messages
       */
      detailedErrors?: boolean;

      /**
       * Custom error formatter
       */
      errorFormatter?: (errors: ZodError) => any;

      /**
       * Whether to strip unknown fields
       */
      stripUnknown?: boolean;
    } = {},
  ) {}

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    // Skip validation if no value
    if (!value) {
      return value;
    }

    // Skip validation for non-body types unless schema is provided
    if (metadata.type !== 'body' && !this.hasSchema(metadata)) {
      return value;
    }

    // Get schema from metadata or use global schema
    const schema = this.getSchema(metadata);

    if (!schema) {
      return value; // No validation required
    }

    try {
      // Parse and validate
      const result = await schema.parseAsync(value);

      this.logger.debug('Validation successful', {
        operation: { name: 'validation', type: metadata.type },
        data: {
          type: metadata.type,
          target: metadata.metatype?.name,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.warn('Validation failed', {
          operation: { name: 'validation', type: metadata.type },
          data: {
            type: metadata.type,
            target: metadata.metatype?.name,
            errors: this.formatZodErrors(error),
          },
        });

        throw new BadRequestException({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Request validation failed',
            details: this.options.errorFormatter
              ? this.options.errorFormatter(error)
              : this.formatZodErrors(error),
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Re-throw non-Zod errors
      throw error;
    }
  }

  /**
   * Check if schema is available for metadata
   */
  private hasSchema(metadata: ArgumentMetadata): boolean {
    return !!(
      metadata.metatype &&
      Reflect.hasMetadata(VALIDATION_SCHEMA_KEY, metadata.metatype)
    );
  }

  /**
   * Get validation schema from metadata
   */
  private getSchema(metadata: ArgumentMetadata): ZodSchema | undefined {
    return metadata.metatype
      ? Reflect.getMetadata(VALIDATION_SCHEMA_KEY, metadata.metatype)
      : undefined;
  }

  /**
   * Format Zod errors for API response
   */
  private formatZodErrors(error: ZodError): Array<{
    field: string;
    message: string;
    code: string;
    received: any;
    expected?: string;
  }> {
    return error.issues.map((err) => ({
      field: err.path.join('.'),
      message: this.formatErrorMessage(err),
      code: err.code,
      received: (err as any).received,
      expected: this.getExpectedMessage(err),
    }));
  }

  /**
   * Format individual error message
   */
  private formatErrorMessage(err: any): string {
    switch (err.code) {
      case 'invalid_type':
        return `Expected ${err.expected}, but received ${err.received}`;
      case 'invalid_literal':
        return `Invalid value, expected one of: ${JSON.stringify(err.expected)}`;
      case 'invalid_string':
        switch (err.validation) {
          case 'email':
            return 'Invalid email format';
          case 'url':
            return 'Invalid URL format';
          case 'uuid':
            return 'Invalid UUID format';
          case 'min':
            return `String must be at least ${err.minimum} characters`;
          case 'max':
            return `String must be at most ${err.maximum} characters`;
          default:
            return `Invalid string: ${err.validation}`;
        }
      case 'invalid_number':
        switch (err.validation) {
          case 'min':
            return `Number must be at least ${err.minimum}`;
          case 'max':
            return `Number must be at most ${err.maximum}`;
          case 'int':
            return 'Number must be an integer';
          case 'positive':
            return 'Number must be positive';
          default:
            return `Invalid number: ${err.validation}`;
        }
      case 'invalid_date':
        return 'Invalid date format';
      case 'too_small':
        return `Must be at least ${err.minimum} items`;
      case 'too_big':
        return `Must be at most ${err.maximum} items`;
      default:
        return err.message || 'Validation failed';
    }
  }

  /**
   * Get expected value message
   */
  private getExpectedMessage(err: any): string | undefined {
    switch (err.code) {
      case 'invalid_type':
        return err.expected;
      case 'invalid_literal':
        return JSON.stringify(err.expected);
      case 'invalid_string':
      case 'invalid_number':
        return err.validation;
      default:
        return undefined;
    }
  }
}

/**
 * Parameter-specific validation pipes
 */

/**
 * Validate path parameters
 */
@Injectable()
export class ZodParamValidationPipe extends ZodValidationPipe {
  constructor(logger: StructuredLogger) {
    super(logger, { transform: true, detailedErrors: true });
  }

  transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (metadata.type !== 'param') {
      return value;
    }
    return super.transform(value, metadata);
  }
}

/**
 * Validate query parameters
 */
@Injectable()
export class ZodQueryValidationPipe extends ZodValidationPipe {
  constructor(logger: StructuredLogger) {
    super(logger, { transform: true, detailedErrors: true });
  }

  transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (metadata.type !== 'query') {
      return value;
    }
    return super.transform(value, metadata);
  }
}

/**
 * Custom validation decorators for common patterns
 */

/**
 * Validate UUID parameter
 */
export const ValidateUUID = (
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    // Find UUID parameters (simple heuristic)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] === 'string' && !uuidRegex.test(args[i])) {
        throw new BadRequestException(`Invalid UUID format at position ${i}`);
      }
    }

    return originalMethod.apply(this, args);
  };
};

/**
 * Validate pagination parameters
 */
export const ValidatePagination = (
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    // Find pagination object (assume it's the first object with page/limit)
    const paginationIndex = args.findIndex(
      (arg) =>
        typeof arg === 'object' &&
        arg !== null &&
        (arg.page !== undefined || arg.limit !== undefined),
    );

    if (paginationIndex !== -1) {
      const pagination = args[paginationIndex];

      // Set defaults
      pagination.page = Math.max(1, parseInt(pagination.page) || 1);
      pagination.limit = Math.min(
        100,
        Math.max(1, parseInt(pagination.limit) || 10),
      );
    }

    return originalMethod.apply(this, args);
  };
};
