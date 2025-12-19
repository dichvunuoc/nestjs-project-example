/**
 * Domain Exception (Pure TypeScript - No Framework Dependency)
 *
 * This exception is used in the Domain Layer for business rule violations.
 * It is intentionally kept as pure TypeScript to maintain domain purity.
 *
 * Examples: Account locked, Insufficient balance, Invalid product state, etc.
 *
 * For HTTP mapping, the GlobalExceptionFilter in Infrastructure Layer
 * will convert this to appropriate HTTP responses.
 */
export class DomainException extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any> | any[];

  /**
   * @param message Message describing the error (for developer/logging)
   * @param code Error code identifier (for client to check: USER_NOT_FOUND, ...)
   * @param details Additional data
   */
  constructor(
    message: string,
    code: string = 'DOMAIN_ERROR',
    details?: Record<string, any> | any[],
  ) {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.details = details;

    // Fix: prototype chain breaks when extending Error in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Static factory method for cleaner domain code
   */
  static withCode(code: string, message: string): DomainException {
    return new DomainException(message, code);
  }

  /**
   * Helper to convert to JSON for logging or client response
   */
  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
