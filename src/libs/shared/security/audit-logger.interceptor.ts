import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError, throwError } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';
import { StructuredLogger } from '../observability/structured-logger.service';
import { AUDIT_LOG_KEY } from './decorators';
import type { IRequestContextProvider } from '../../core';
import { REQUEST_CONTEXT_TOKEN } from '../../core';

/**
 * Audit log configuration interface
 */
export interface AuditLogConfig {
  /**
   * Audit log action name
   */
  action: string;

  /**
   * Resource type being acted upon
   */
  resource?: string;

  /**
   * Whether to log request body
   */
  logRequestBody?: boolean;

  /**
   * Whether to log response body
   */
  logResponseBody?: boolean;

  /**
   * Fields to redact from audit logs
   */
  redactFields?: string[];

  /**
   * Custom fields to include in audit log
   */
  customFields?: Record<string, any>;
}

/**
 * Audit Logger Decorator
 *
 * Marks methods that should be logged for audit purposes.
 * Used for security, compliance, and business intelligence.
 *
 * Usage:
 * ```typescript
 * @AuditLog({
 *   action: 'product.created',
 *   resource: 'product',
 *   logRequestBody: true,
 *   redactFields: ['password', 'secret'],
 * })
 * @Post('products')
 * async createProduct(@Body() dto: CreateProductDto) {
 *   // This will be audited
 * }
 *
 * @AuditLog({
 *   action: 'user.deleted',
 *   resource: 'user',
 *   customFields: { sensitivity: 'high', category: 'security' },
 * })
 * @Delete('users/:id')
 * async deleteUser(@Param('id') id: string) {
 *   // Critical security operation
 * }
 * ```
 */
export const AuditLog = (config: AuditLogConfig) =>
  SetMetadata(AUDIT_LOG_KEY, config);

/**
 * Audit Logging Interceptor
 *
 * Automatically logs auditable operations with structured format.
 * Captures who, what, when, where, and how for security and compliance.
 *
 * Features:
 * - Immutable audit trail
 * - User attribution
 * - Request/response logging
 * - Sensitive data redaction
 * - Business context preservation
 * - Correlation with other logs
 */
@Injectable()
export class AuditLoggerInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: StructuredLogger,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get audit configuration
    const auditConfig = this.getAuditConfig(context);
    if (!auditConfig) {
      return next.handle(); // No audit logging required
    }

    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Create audit entry
    const auditEntry = this.createAuditEntry(context, auditConfig, startTime);

    // Log audit start
    this.logger.info(`AUDIT: ${auditConfig.action} - STARTED`, auditEntry);

    return next.handle().pipe(
      tap((data) => {
        // Log successful completion
        this.logAuditSuccess(context, auditConfig, data, startTime);
      }),
      catchError((error) => {
        // Log audit failure
        this.logAuditError(context, auditConfig, error, startTime);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get audit configuration from metadata
   */
  private getAuditConfig(context: ExecutionContext): AuditLogConfig | null {
    return (
      Reflect.getMetadata(AUDIT_LOG_KEY, context.getHandler()) ||
      Reflect.getMetadata(AUDIT_LOG_KEY, context.getClass())
    );
  }

  /**
   * Create initial audit entry
   */
  private createAuditEntry(
    context: ExecutionContext,
    config: AuditLogConfig,
    startTime: number,
  ): any {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestContext = this.requestContext?.current();

    return {
      audit: {
        action: config.action,
        resource: config.resource,
        timestamp: new Date().toISOString(),
        sessionId: requestContext?.correlationId,
        requestId: requestContext?.causationId,
      },
      user: {
        id: (request as any).user?.id,
        email: (request as any).user?.email,
        roles: (request as any).user?.roles,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      operation: {
        method: request.method,
        url: request.url,
        path: request.url.split('?')[0],
        query: request.query,
        startTime,
      },
      data: {
        requestBody: config.logRequestBody
          ? this.sanitizeData(request.body, config.redactFields)
          : undefined,
        customFields: config.customFields,
      },
      business: {
        resource: config.resource,
        resourceId: (request.params as any)?.id || (request.body as any)?.id,
      },
    };
  }

  /**
   * Log successful audit completion
   */
  private logAuditSuccess(
    context: ExecutionContext,
    config: AuditLogConfig,
    responseData: any,
    startTime: number,
  ): void {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const duration = Date.now() - startTime;

    const auditEntry = {
      audit: {
        action: config.action,
        resource: config.resource,
        timestamp: new Date().toISOString(),
        status: 'success',
        duration,
        sessionId: this.requestContext?.current()?.correlationId,
      },
      user: {
        id: (request as any).user?.id,
        email: (request as any).user?.email,
      },
      operation: {
        method: request.method,
        url: request.url,
        statusCode: response.statusCode,
        duration,
      },
      data: {
        responseBody: config.logResponseBody
          ? this.sanitizeData(responseData, config.redactFields)
          : undefined,
        customFields: config.customFields,
      },
      business: {
        resource: config.resource,
        resourceId: responseData?.id || (request.params as any)?.id,
      },
    };

    this.logger.info(`AUDIT: ${config.action} - COMPLETED`, auditEntry);
  }

  /**
   * Log audit failure
   */
  private logAuditError(
    context: ExecutionContext,
    config: AuditLogConfig,
    error: Error,
    startTime: number,
  ): void {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const duration = Date.now() - startTime;

    const auditEntry = {
      audit: {
        action: config.action,
        resource: config.resource,
        timestamp: new Date().toISOString(),
        status: 'failed',
        duration,
        error: {
          name: error.name,
          message: error.message,
          stack:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        sessionId: this.requestContext?.current()?.correlationId,
      },
      user: {
        id: (request as any).user?.id,
        email: (request as any).user?.email,
      },
      operation: {
        method: request.method,
        url: request.url,
        duration,
      },
      data: {
        requestBody: config.logRequestBody
          ? this.sanitizeData(request.body, config.redactFields)
          : undefined,
        customFields: config.customFields,
      },
    };

    this.logger.error(`AUDIT: ${config.action} - FAILED`, error, auditEntry);
  }

  /**
   * Sanitize sensitive data from audit logs
   */
  private sanitizeData(data: any, redactFields: string[] = []): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const defaultSensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
    ];

    const sensitiveFields = [...defaultSensitiveFields, ...redactFields];

    return this.redactFields(data, sensitiveFields);
  }

  /**
   * Recursively redact sensitive fields
   */
  private redactFields(obj: any, sensitiveFields: string[]): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactFields(item, sensitiveFields));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.redactFields(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Sensitive Operation Decorator
 *
 * Marks operations that handle sensitive data or perform critical actions.
 * Adds extra logging and security measures.
 */
export const SensitiveOperation = (options: {
  /**
   * Operation category for classification
   */
  category: 'security' | 'finance' | 'personal_data' | 'system';

  /**
   * Additional security measures
   */
  security?: {
    requireMFA?: boolean;
    requireAdmin?: boolean;
    logToSIEM?: boolean;
  };

  /**
   * Retention policy for audit logs
   */
  retention?: {
    days?: number;
    immutable?: boolean;
  };
}) => {
  const auditConfig: AuditLogConfig = {
    action: `sensitive.${options.category}`,
    resource: options.category,
    logRequestBody: true,
    logResponseBody: false, // Don't log responses for sensitive operations
    redactFields: ['password', 'token', 'secret', 'key'],
    customFields: {
      sensitivity: 'high',
      category: options.category,
      security: options.security,
      retention: options.retention,
    },
  };

  return SetMetadata(AUDIT_LOG_KEY, auditConfig);
};

/**
 * Common audit configurations for frequent use
 */
export const AuditLogCreation = (resource: string) =>
  AuditLog({
    action: `${resource}.created`,
    resource,
    logRequestBody: true,
  });

export const AuditLogUpdate = (resource: string) =>
  AuditLog({
    action: `${resource}.updated`,
    resource,
    logRequestBody: true,
  });

export const AuditLogDeletion = (resource: string) =>
  AuditLog({
    action: `${resource}.deleted`,
    resource,
    customFields: { irreversible: true },
  });

export const AuditLogRead = (resource: string) =>
  AuditLog({
    action: `${resource}.read`,
    resource,
  });

export const AuditLogSecurity = (action: string) =>
  AuditLog({
    action: `security.${action}`,
    resource: 'security',
    customFields: { category: 'security' },
  });
