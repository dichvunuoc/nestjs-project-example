import { IDomainEvent } from '../../domain/events';

/**
 * Outbox Entry Status
 *
 * Trạng thái của một event trong Outbox table
 */
export enum OutboxEntryStatus {
  /** Chờ xử lý */
  PENDING = 'PENDING',

  /** Đang xử lý */
  PROCESSING = 'PROCESSING',

  /** Đã xử lý thành công */
  PROCESSED = 'PROCESSED',

  /** Xử lý thất bại */
  FAILED = 'FAILED',
}

/**
 * Outbox Entry Interface
 *
 * Đại diện cho một entry trong Outbox table
 * Được lưu trong cùng transaction với aggregate
 */
export interface IOutboxEntry {
  /** Unique ID của outbox entry (thường dùng eventId) */
  readonly id: string;

  /** ID của aggregate phát sinh event */
  readonly aggregateId: string;

  /** Loại aggregate (e.g., 'Product', 'Order') */
  readonly aggregateType: string;

  /** Loại event (e.g., 'ProductCreated', 'OrderShipped') */
  readonly eventType: string;

  /** Event payload dạng JSON string */
  readonly payload: string;

  /** Trạng thái xử lý */
  status: OutboxEntryStatus;

  /** Thời điểm tạo */
  readonly createdAt: Date;

  /** Thời điểm xử lý xong (null nếu chưa xử lý) */
  processedAt: Date | null;

  /** Số lần retry */
  retryCount: number;

  /** Lỗi cuối cùng (nếu có) */
  lastError: string | null;
}

/**
 * Outbox Repository Interface (Port)
 *
 * Interface để thao tác với Outbox table
 * Implementation sẽ ở Infrastructure Layer
 */
export interface IOutboxRepository {
  /**
   * Thêm event vào outbox (trong cùng transaction với aggregate)
   *
   * @param event Domain event cần lưu
   * @param transaction Transaction context từ Unit of Work
   */
  add(event: IDomainEvent, transaction?: unknown): Promise<void>;

  /**
   * Thêm nhiều events vào outbox
   *
   * @param events Danh sách domain events
   * @param transaction Transaction context
   */
  addMany(events: IDomainEvent[], transaction?: unknown): Promise<void>;

  /**
   * Lấy các entries pending để xử lý
   *
   * @param limit Số lượng tối đa
   * @returns Danh sách outbox entries
   */
  getPending(limit: number): Promise<IOutboxEntry[]>;

  /**
   * Đánh dấu entry đang được xử lý (lock)
   *
   * @param id Entry ID
   * @returns true nếu lock thành công
   */
  markAsProcessing(id: string): Promise<boolean>;

  /**
   * Đánh dấu entry đã xử lý xong
   *
   * @param id Entry ID
   */
  markAsProcessed(id: string): Promise<void>;

  /**
   * Đánh dấu entry xử lý thất bại
   *
   * @param id Entry ID
   * @param error Thông tin lỗi
   */
  markAsFailed(id: string, error: string): Promise<void>;

  /**
   * Xóa các entries đã xử lý (cleanup job)
   *
   * @param olderThan Xóa các entries cũ hơn thời điểm này
   * @returns Số lượng đã xóa
   */
  deleteProcessed(olderThan: Date): Promise<number>;

  /**
   * Reset các entries đã fail để retry lại
   *
   * @param maxRetries Số lần retry tối đa, chỉ reset entries có retryCount < maxRetries
   * @returns Số lượng entries đã reset
   */
  resetForRetry(maxRetries: number): Promise<number>;
}

/**
 * Outbox Processor Interface
 *
 * Interface cho service xử lý outbox entries
 */
export interface IOutboxProcessor {
  /**
   * Xử lý các pending entries
   * Thường được gọi bởi scheduled job
   */
  processOutbox(): Promise<void>;

  /**
   * Start processing (background job)
   */
  start(): void;

  /**
   * Stop processing
   */
  stop(): void;
}

/**
 * Outbox Configuration Interface
 */
export interface IOutboxConfig {
  /** Interval giữa các lần poll (ms) */
  readonly pollingIntervalMs: number;

  /** Số entries tối đa mỗi lần poll */
  readonly batchSize: number;

  /** Số lần retry tối đa */
  readonly maxRetries: number;

  /** Thời gian giữ entries đã xử lý (ms) */
  readonly retentionPeriodMs: number;
}
