import { BaseException } from './base.exception';

/**
 * Domain Exception
 * Dùng cho các lỗi nghiệp vụ logic (Business Rules)
 * Ví dụ: Tài khoản bị khóa, Số dư không đủ...
 */
export class DomainException extends BaseException {
  /**
   * @param message Message mô tả lỗi (cho developer/log)
   * @param code Code định danh lỗi (cho client check: USER_NOT_FOUND, ...)
   * @param details Dữ liệu bổ sung
   */
  constructor(message: string, code: string = 'DOMAIN_ERROR', details?: any) {
    super(message, code, details);
  }

  // Static factory methods giúp code domain dễ đọc hơn
  static withCode(code: string, message: string): DomainException {
    return new DomainException(message, code);
  }
}
