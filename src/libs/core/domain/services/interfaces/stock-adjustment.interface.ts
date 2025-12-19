/**
 * Stock Adjustment Interfaces (Domain Layer)
 *
 * Định nghĩa các interfaces liên quan đến Stock Adjustment tại Domain Layer
 * để tránh Domain Service phụ thuộc vào Application Layer.
 *
 * Nguyên tắc: Domain Layer không được import từ Application Layer
 */

/**
 * Stock Adjustment Item Interface
 *
 * Đại diện cho một item trong batch adjustment request
 * Được định nghĩa ở Domain để Domain Service có thể sử dụng
 */
export interface IStockAdjustmentItem {
  /** ID của product cần adjust */
  readonly productId: string;

  /** Số lượng điều chỉnh (positive = tăng, negative = giảm) */
  readonly quantity: number;

  /** Lý do điều chỉnh (optional) */
  readonly reason?: string;
}

/**
 * Stock Adjustment Result Interface
 *
 * Kết quả của việc điều chỉnh stock cho một product
 */
export interface IStockAdjustmentResult {
  /** ID của product */
  readonly productId: string;

  /** Thành công hay thất bại */
  readonly success: boolean;

  /** Stock trước khi điều chỉnh */
  readonly previousStock: number;

  /** Stock sau khi điều chỉnh */
  readonly newStock: number;

  /** Số lượng đã điều chỉnh */
  readonly quantity: number;

  /** Lỗi nếu có */
  readonly error?: string;

  /** Cảnh báo nếu có */
  readonly warning?: string;
}

/**
 * Bulk Stock Adjustment Options Interface
 *
 * Các tùy chọn cho bulk adjustment operation
 */
export interface IBulkStockAdjustmentOptions {
  /**
   * Giới hạn stock tối đa sau khi điều chỉnh
   */
  readonly maxStockLimit?: number;

  /**
   * Ngưỡng stock tối thiểu để cảnh báo
   */
  readonly minStockThreshold?: number;

  /**
   * Cho phép thành công từng phần (partial success)
   * - true: Tiếp tục với các items thành công
   * - false: Rollback tất cả nếu có item fail
   */
  readonly allowPartialSuccess?: boolean;

  /**
   * Reference ID cho batch (để tracking/audit)
   */
  readonly batchReference?: string;
}
