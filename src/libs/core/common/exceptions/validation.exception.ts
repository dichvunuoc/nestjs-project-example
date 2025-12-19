import { BaseException } from './base.exception';

export interface IValidationErrorDetail {
  property: string; // Tên trường bị lỗi (vd: email)
  constraints: Record<string, string>; // Chi tiết lỗi (vd: { isEmail: "Email invalid" })
}

/**
 * Validation Exception
 * Thường được ném ra từ tầng Domain (khi validate entity) hoặc Application (DTO)
 */
export class ValidationException extends BaseException {
  constructor(errors: IValidationErrorDetail[] | string) {
    // Nếu truyền string thì wrap lại, nếu truyền array thì gán vào details
    const message = typeof errors === 'string' ? errors : 'Validation failed';
    const details = typeof errors === 'string' ? undefined : errors;

    super(message, 'VALIDATION_ERROR', details);
  }
}
