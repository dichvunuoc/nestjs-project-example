import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  BaseException,
  DomainException,
  ValidationException,
  ConcurrencyException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from 'src/libs/core/common';

/**
 * Global Exception Filter
 *
 * Catches all exceptions and transforms them into standardized HTTP responses
 * Maps domain exceptions to appropriate HTTP status codes
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, response, request);
    }

    // Handle custom domain exceptions
    if (exception instanceof BaseException) {
      return this.handleBaseException(exception, response, request);
    }

    // Handle unknown errors
    return this.handleUnknownError(exception, response, request);
  }

  private handleHttpException(
    exception: HttpException,
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message,
      details:
        typeof exceptionResponse === 'object' && 'error' in exceptionResponse
          ? exceptionResponse
          : undefined,
    };

    response.status(status).send(errorResponse);
  }

  private handleBaseException(
    exception: BaseException,
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    const status = this.getHttpStatus(exception);
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        name: exception.name,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      },
    };

    response.status(status).send(errorResponse);
  }

  private handleUnknownError(
    exception: unknown,
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    const error =
      exception instanceof Error ? exception : new Error('Unknown error');
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const errorResponse = {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        name: 'InternalServerError',
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack }),
      },
    };

    if (!isDevelopment) {
      console.error('Unhandled exception:', error);
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(errorResponse);
  }

  private getHttpStatus(exception: BaseException): number {
    if (exception instanceof NotFoundException) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof UnauthorizedException) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (exception instanceof ForbiddenException) {
      return HttpStatus.FORBIDDEN;
    }
    if (exception instanceof ConflictException) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof ConcurrencyException) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof ValidationException) {
      return HttpStatus.BAD_REQUEST;
    }
    if (exception instanceof DomainException) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
