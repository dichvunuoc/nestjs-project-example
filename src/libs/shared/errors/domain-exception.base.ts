import { DomainException as CoreDomainException } from '../../core/domain';

/**
 * Enhanced Domain Exception with additional context
 *
 * Extends the core domain exception with additional features for
 * production error handling and user communication.
 */
export class DomainException extends CoreDomainException {
  /**
   * Error context for additional information
   */
  public readonly context?: Record<string, any>;

  /**
   * User-friendly error message
   */
  public readonly userMessage?: string;

  /**
   * Error code for programmatic handling
   */
  public readonly errorCode?: string;

  /**
   * Whether this error is retryable
   */
  public readonly retryable?: boolean;

  /**
   * Suggested actions for the user
   */
  public readonly suggestedAction?: string;

  constructor(
    message: string,
    options: {
      context?: Record<string, any>;
      userMessage?: string;
      errorCode?: string;
      retryable?: boolean;
      suggestedAction?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, options.errorCode || 'DOMAIN_ERROR', options.context);

    this.context = options.context;
    this.userMessage = options.userMessage;
    this.errorCode = options.errorCode;
    this.retryable = options.retryable || false;
    this.suggestedAction = options.suggestedAction;
  }
}

/**
 * Business Rule Violation Exception
 *
 * Thrown when a business rule is violated.
 * These are typically user-correctable errors.
 */
export class BusinessRuleViolationException extends DomainException {
  constructor(
    ruleName: string,
    message: string,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
      suggestedAction?: string;
    } = {},
  ) {
    super(message, {
      errorCode: `BUSINESS_RULE_VIOLATION_${ruleName.toUpperCase()}`,
      userMessage: options.userMessage || message,
      context: { ruleName, ...options.context },
      suggestedAction: options.suggestedAction,
    });
  }
}

/**
 * Resource Not Found Exception
 *
 * Thrown when a requested resource cannot be found.
 */
export class ResourceNotFoundException extends DomainException {
  constructor(
    resourceType: string,
    resourceId: string | number,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
    } = {},
  ) {
    const message = `${resourceType} with ID ${resourceId} not found`;
    const userMessage =
      options.userMessage ||
      `The ${resourceType.toLowerCase()} you're looking for doesn't exist`;

    super(message, {
      errorCode: 'RESOURCE_NOT_FOUND',
      userMessage,
      context: {
        resourceType,
        resourceId,
        ...options.context,
      },
    });
  }
}

/**
 * Duplicate Resource Exception
 *
 * Thrown when trying to create a resource that already exists.
 */
export class DuplicateResourceException extends DomainException {
  constructor(
    resourceType: string,
    identifier: string,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
      suggestedAction?: string;
    } = {},
  ) {
    const message = `${resourceType} with ${identifier} already exists`;
    const userMessage =
      options.userMessage ||
      `A ${resourceType.toLowerCase()} with these details already exists`;

    super(message, {
      errorCode: 'DUPLICATE_RESOURCE',
      userMessage,
      context: {
        resourceType,
        identifier,
        ...options.context,
      },
      suggestedAction:
        options.suggestedAction || 'Please use a different identifier',
    });
  }
}

/**
 * Invalid State Exception
 *
 * Thrown when an operation is not allowed in the current state.
 */
export class InvalidStateException extends DomainException {
  constructor(
    currentState: string,
    requiredState: string,
    operation: string,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
    } = {},
  ) {
    const message = `Cannot perform '${operation}' in state '${currentState}'. Required state: '${requiredState}'`;
    const userMessage =
      options.userMessage || `This action is not available at this time`;

    super(message, {
      errorCode: 'INVALID_STATE',
      userMessage,
      context: {
        currentState,
        requiredState,
        operation,
        ...options.context,
      },
    });
  }
}

/**
 * Insufficient Permissions Exception
 *
 * Thrown when a user doesn't have required permissions.
 */
export class InsufficientPermissionsException extends DomainException {
  constructor(
    requiredPermission: string | string[],
    options: {
      userMessage?: string;
      context?: Record<string, any>;
      suggestedAction?: string;
    } = {},
  ) {
    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission.join(', ')
      : requiredPermission;

    const message = `Insufficient permissions. Required: ${permissions}`;
    const userMessage =
      options.userMessage || "You don't have permission to perform this action";

    super(message, {
      errorCode: 'INSUFFICIENT_PERMISSIONS',
      userMessage,
      context: {
        requiredPermissions: Array.isArray(requiredPermission)
          ? requiredPermission
          : [requiredPermission],
        ...options.context,
      },
      suggestedAction:
        options.suggestedAction || 'Contact your administrator for access',
    });
  }
}

/**
 * Concurrent Modification Exception
 *
 * Thrown when a resource has been modified by another process.
 */
export class ConcurrentModificationException extends DomainException {
  constructor(
    resourceType: string,
    resourceId: string | number,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
      suggestedAction?: string;
    } = {},
  ) {
    const message = `${resourceType} ${resourceId} has been modified by another process`;
    const userMessage =
      options.userMessage ||
      'This item has been updated by someone else. Please refresh and try again';

    super(message, {
      errorCode: 'CONCURRENT_MODIFICATION',
      userMessage,
      retryable: true,
      context: {
        resourceType,
        resourceId,
        ...options.context,
      },
      suggestedAction:
        options.suggestedAction || 'Refresh the page and try again',
    });
  }
}

/**
 * External Service Exception
 *
 * Thrown when an external service call fails.
 */
export class ExternalServiceException extends DomainException {
  constructor(
    serviceName: string,
    originalError: Error,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
      retryable?: boolean;
      suggestedAction?: string;
    } = {},
  ) {
    const message = `External service '${serviceName}' failed: ${originalError.message}`;
    const userMessage =
      options.userMessage ||
      "We're having trouble connecting to an external service";

    super(message, {
      errorCode: 'EXTERNAL_SERVICE_ERROR',
      userMessage,
      retryable: options.retryable ?? true,
      context: {
        serviceName,
        originalError: originalError.message,
        ...options.context,
      },
      suggestedAction:
        options.suggestedAction || 'Please try again in a few moments',
      cause: originalError,
    });
  }
}

/**
 * Rate Limit Exceeded Exception
 *
 * Thrown when a rate limit is exceeded.
 */
export class RateLimitExceededException extends DomainException {
  constructor(
    limit: number,
    windowMs: number,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
      suggestedAction?: string;
    } = {},
  ) {
    const message = `Rate limit exceeded: ${limit} requests per ${windowMs}ms`;
    const userMessage =
      options.userMessage ||
      'Too many requests. Please slow down and try again';

    super(message, {
      errorCode: 'RATE_LIMIT_EXCEEDED',
      userMessage,
      retryable: true,
      context: {
        limit,
        windowMs,
        resetTime: Date.now() + windowMs,
        ...options.context,
      },
      suggestedAction:
        options.suggestedAction ||
        `Please wait ${Math.ceil(windowMs / 1000)} seconds before trying again`,
    });
  }
}

/**
 * Validation Exception
 *
 * Thrown when validation fails at the domain level.
 */
export class ValidationException extends DomainException {
  constructor(
    validationErrors: Array<{
      field: string;
      message: string;
      value?: any;
    }>,
    options: {
      userMessage?: string;
      context?: Record<string, any>;
      suggestedAction?: string;
    } = {},
  ) {
    const message = `Validation failed: ${validationErrors.map((e) => e.message).join(', ')}`;
    const userMessage =
      options.userMessage || 'Please check your input and try again';

    super(message, {
      errorCode: 'VALIDATION_FAILED',
      userMessage,
      context: {
        validationErrors,
        ...options.context,
      },
      suggestedAction:
        options.suggestedAction ||
        'Please fix the validation errors and try again',
    });
  }
}
