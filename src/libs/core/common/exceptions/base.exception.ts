/**
 * Base Exception class
 */
export abstract class BaseException extends Error {
  constructor(
    message: string,
    public readonly code: string, // Code bắt buộc phải rõ ràng
    public readonly details?: Record<string, any> | any[], // Details nên linh hoạt
  ) {
    super(message);
    this.name = this.constructor.name;

    // Fix issue: prototype chain bị gãy khi extend Error trong TS
    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Helper để log ra JSON đẹp hoặc gửi về Client
  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      // stack: this.stack, // Chỉ bật khi dev mode
    };
  }
}
