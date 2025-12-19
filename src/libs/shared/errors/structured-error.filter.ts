import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from 'class-validator';
import { StructuredLogger } from '../observability/structured-logger.service';
import type { IRequestContextProvider } from '../../core';
import { REQUEST_CONTEXT_TOKEN } from '../../core';
import { DomainException } from '../../core/domain';

/**
 * Error response structure for consistent API responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
    userId?: string;
    correlationId?: string;
    stack?: string; // Only in development
  };
}

/**
 * Error codes for standardized error handling
 */
export enum ErrorCodes {
  // Validation Errors (400)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Authentication Errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',

  // Authorization Errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',

  // Not Found Errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ENDPOINT_NOT_FOUND = 'ENDPOINT_NOT_FOUND',

  // Conflict Errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Business Logic Errors (422)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  DOMAIN_ERROR = 'DOMAIN_ERROR',
  INVALID_OPERATION = 'INVALID_OPERATION',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server Errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Timeout Errors (504)
  TIMEOUT = 'TIMEOUT',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Circuit Breaker
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
}

/**
 * Structured Error Filter
 *
 * Catches all exceptions and transforms them into consistent JSON responses.
 * Provides structured logging, error categorization, and proper HTTP status mapping.
 *
 * Features:
 * - Consistent error response format
 * - Error code categorization
 * - Detailed validation error messages
 * - Structured logging with context
 * - Stack traces in development
 * - Request correlation tracking
 * - Error sanitization for production
 */
@Catch()
export class StructuredErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(StructuredErrorFilter.name);

  constructor(
    private readonly structuredLogger: StructuredLogger,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Determine error type and status
    const { status, errorResponse, error } = this.handleError(
      exception,
      request,
    );

    // Log the error
    this.logError(error, request, exception);

    // Send error response
    response.status(status).send(errorResponse);
  }

  /**
   * Handle different types of exceptions and convert to standardized format
   */
  private handleError(
    exception: unknown,
    request: FastifyRequest,
  ): {
    status: number;
    errorResponse: ErrorResponse;
    error: Error;
  } {
    const path = request.url;
    const requestContext = this.requestContext?.current();

    // Base error response structure
    const createErrorResponse = (
      code: string,
      message: string,
      details?: any,
    ): ErrorResponse => ({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path,
        requestId: requestContext?.causationId,
        userId: requestContext?.userId,
        correlationId: requestContext?.correlationId,
        ...(process.env.NODE_ENV === 'development' && {
          stack: (exception as Error)?.stack,
        }),
      },
    });

    // Handle HTTP Exceptions (NestJS built-in)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      let code = ErrorCodes.INTERNAL_ERROR;
      let message = 'Internal server error';
      let details: unknown;

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const responseObject = response as Record<string, unknown>;
        message =
          (responseObject.message as string) ||
          (responseObject.error as string) ||
          message;
        details = responseObject.details || responseObject;
      }

      // Map HTTP status to error codes
      code = this.mapHttpStatusToErrorCode(status);

      return {
        status,
        errorResponse: createErrorResponse(code, message, details),
        error: exception as Error,
      };
    }

    // Handle Domain Exceptions (DDD)
    if (exception instanceof DomainException) {
      const status = HttpStatus.UNPROCESSABLE_ENTITY;
      const code = ErrorCodes.DOMAIN_ERROR;
      const message = exception.message;

      return {
        status,
        errorResponse: createErrorResponse(code, message, {
          type: exception.constructor.name,
          context: (exception as DomainException & { context?: unknown })
            .context,
        }),
        error: exception,
      };
    }

    // Handle Validation Errors
    if (
      exception instanceof ValidationError ||
      this.isValidationErrorArray(exception)
    ) {
      const status = HttpStatus.BAD_REQUEST;
      const code = ErrorCodes.VALIDATION_FAILED;
      const details = this.formatValidationErrors(exception);

      return {
        status,
        errorResponse: createErrorResponse(code, 'Validation failed', details),
        error: new Error('Validation failed'),
      };
    }

    // Handle Database Errors
    if (
      exception instanceof Error &&
      exception.constructor.name === 'QueryFailedError'
    ) {
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      const code = ErrorCodes.DATABASE_ERROR;
      const message = 'Database operation failed';

      return {
        status,
        errorResponse: createErrorResponse(code, message, {
          type: 'database_error',
        }),
        error: exception,
      };
    }

    // Handle generic Errors
    if (exception instanceof Error) {
      const status = this.mapErrorToStatus(exception);
      const code = this.mapErrorToErrorCode(exception);
      const message = exception.message || 'An unexpected error occurred';

      return {
        status,
        errorResponse: createErrorResponse(code, message, {
          type: exception.constructor.name,
        }),
        error: exception,
      };
    }

    // Unknown error type
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const code = ErrorCodes.INTERNAL_ERROR;
    const message = 'An unexpected error occurred';

    return {
      status,
      errorResponse: createErrorResponse(code, message),
      error: new Error('Unknown error'),
    };
  }

  /**
   * Log error with structured format
   */
  private logError(
    error: Error,
    request: FastifyRequest,
    _exception: unknown,
  ): void {
    const requestContext = this.requestContext?.current();

    this.structuredLogger.error(
      `Request failed: ${request.method} ${request.url} - ${error.message}`,
      error,
      {
        operation: {
          name: `${request.method} ${request.url}`,
          type: 'http_request',
          phase: 'error',
        },
        data: {
          method: request.method,
          url: request.url,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
          headers: this.sanitizeHeaders(
            request.headers as Record<string, string>,
          ),
          body:
            request.method !== 'GET'
              ? this.sanitizeBody(request.body)
              : undefined,
        },
        trace: {
          id: requestContext?.correlationId,
          correlationId: requestContext?.correlationId,
          causationId: requestContext?.causationId,
          userId: requestContext?.userId,
        },
      },
    );
  }

  /**
   * Map HTTP status to error codes
   */
  private mapHttpStatusToErrorCode(status: number): ErrorCodes {
    switch (status) {
      case 400:
        return ErrorCodes.INVALID_INPUT;
      case 401:
        return ErrorCodes.UNAUTHORIZED;
      case 403:
        return ErrorCodes.FORBIDDEN;
      case 404:
        return ErrorCodes.NOT_FOUND;
      case 409:
        return ErrorCodes.CONFLICT;
      case 422:
        return ErrorCodes.BUSINESS_RULE_VIOLATION;
      case 429:
        return ErrorCodes.RATE_LIMIT_EXCEEDED;
      case 504:
        return ErrorCodes.GATEWAY_TIMEOUT;
      case 503:
        return ErrorCodes.SERVICE_UNAVAILABLE;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }

  /**
   * Map error to HTTP status code
   */
  private mapErrorToStatus(error: Error): number {
    // Check for specific error patterns
    const message = error.message.toLowerCase();

    if (message.includes('not found') || message.includes('does not exist')) {
      return HttpStatus.NOT_FOUND;
    }

    if (
      message.includes('unauthorized') ||
      message.includes('authentication')
    ) {
      return HttpStatus.UNAUTHORIZED;
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return HttpStatus.FORBIDDEN;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return HttpStatus.BAD_REQUEST;
    }

    if (message.includes('conflict') || message.includes('duplicate')) {
      return HttpStatus.CONFLICT;
    }

    if (message.includes('timeout')) {
      return HttpStatus.GATEWAY_TIMEOUT;
    }

    if (
      message.includes('rate limit') ||
      message.includes('too many requests')
    ) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Map error to error code
   */
  private mapErrorToErrorCode(error: Error): ErrorCodes {
    const name = error.constructor.name.toLowerCase();
    const message = error.message.toLowerCase();

    if (name.includes('validation') || message.includes('validation')) {
      return ErrorCodes.VALIDATION_FAILED;
    }

    if (name.includes('notfound') || message.includes('not found')) {
      return ErrorCodes.NOT_FOUND;
    }

    if (name.includes('unauthorized') || message.includes('unauthorized')) {
      return ErrorCodes.UNAUTHORIZED;
    }

    if (name.includes('forbidden') || message.includes('forbidden')) {
      return ErrorCodes.FORBIDDEN;
    }

    if (name.includes('conflict') || message.includes('conflict')) {
      return ErrorCodes.CONFLICT;
    }

    if (name.includes('timeout') || message.includes('timeout')) {
      return ErrorCodes.TIMEOUT;
    }

    return ErrorCodes.INTERNAL_ERROR;
  }

  /**
   * Format validation errors for API response
   */
  private formatValidationErrors(exception: unknown): any {
    if (this.isValidationErrorArray(exception)) {
      return exception.map((err) => ({
        field: err.property,
        message: Object.values(err.constraints || {}).join(', '),
        value: err.value,
      }));
    }

    return exception;
  }

  /**
   * Check if exception is a validation error array
   */
  private isValidationErrorArray(
    exception: unknown,
  ): exception is ValidationError[] {
    return (
      Array.isArray(exception) &&
      exception.length > 0 &&
      exception[0] instanceof ValidationError
    );
  }

  /**
   * Sanitize headers by removing sensitive information
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-session-token',
    ];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request body by removing sensitive fields
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];

    const sanitized = { ...body };
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
