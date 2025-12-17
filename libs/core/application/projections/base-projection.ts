import { Injectable, Logger } from '@nestjs/common';
import { IProjection } from './interfaces/projection.interface';
import { IDomainEvent } from '../../domain/events';

/**
 * Base Projection abstract class
 *
 * Cung cấp nền tảng cho các Projection lắng nghe Domain Events và cập nhật Read Model
 *
 * Projection có thể:
 * - Update SQL database (Denormalizer pattern)
 * - Update Redis cache
 * - Send notifications
 * - Update Elasticsearch index
 *
 * Note: Projection phải đảm bảo Idempotency (lũy đẳng):
 * - Insert: Check if exists -> Ignore duplicate
 * - Update: Check version. Chỉ update nếu event.version > current_db_version
 *
 * @template TEvent - Type của Domain Event mà projection này xử lý
 */
@Injectable()
export abstract class BaseProjection<TEvent extends IDomainEvent> implements IProjection<TEvent> {
  /**
   * Logger instance với projection name
   */
  protected readonly logger: Logger;

  constructor() {
    this.logger = new Logger(this.getName());
  }

  /**
   * Handle domain event và update Read Model
   * Subclasses must implement this method
   *
   * @param event Domain event to handle
   */
  abstract handle(event: TEvent): Promise<void>;

  /**
   * Get projection name cho logging và debugging
   * Default implementation returns class name
   * Can be overridden for custom naming
   *
   * @returns Projection class name
   */
  public getName(): string {
    return this.constructor.name;
  }

  /**
   * Common error handler cho Read Side projections
   * Logs error với projection context
   *
   * @param error Error to handle
   * @param context Additional context (event type, aggregate ID, etc.)
   */
  protected handleError(error: Error, context?: Record<string, any>): void {
    const contextStr = context ? JSON.stringify(context) : '';
    this.logger.error(
      `Projection failed: ${error.message}${contextStr ? ` | Context: ${contextStr}` : ''}`,
      error.stack,
    );
  }
}
