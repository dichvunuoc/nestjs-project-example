import { BaseException } from './base.exception';

/**
 * Unauthorized Exception
 * Thrown when authentication is required but not provided or invalid
 * HTTP Status: 401
 */
export class UnauthorizedException extends BaseException {
  constructor(
    message: string = 'Unauthorized',
    code: string = 'UNAUTHORIZED',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  /**
   * Static factory method for missing authentication
   */
  static missingToken(): UnauthorizedException {
    return new UnauthorizedException(
      'Authentication token is required',
      'MISSING_TOKEN',
    );
  }

  /**
   * Static factory method for invalid token
   */
  static invalidToken(reason?: string): UnauthorizedException {
    return new UnauthorizedException(
      reason || 'Invalid authentication token',
      'INVALID_TOKEN',
      { reason },
    );
  }

  /**
   * Static factory method for expired token
   */
  static expiredToken(): UnauthorizedException {
    return new UnauthorizedException(
      'Authentication token has expired',
      'TOKEN_EXPIRED',
    );
  }
}
