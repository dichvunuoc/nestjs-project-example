import { IEntity } from './entity.interface';
import { IDomainEvent } from '../../events';

/**
 * Aggregate Root interface
 * Pure TypeScript interface - No Framework Dependency
 *
 * Aggregate Root là entry point duy nhất để tương tác với aggregate
 * Đảm bảo consistency boundary và quản lý domain events
 *
 * CHỈ Aggregate Root mới được phép phát ra Domain Event.
 * Entity con chỉ là bộ phận nội bộ, không được giao tiếp trực tiếp với thế giới bên ngoài.
 */
export interface IAggregateRoot extends IEntity {
  /**
   * Get all domain events từ aggregate
   */
  getDomainEvents(): IDomainEvent[];

  /**
   * Clear all domain events sau khi đã publish
   */
  clearDomainEvents(): void;

  /**
   * Get aggregate version cho optimistic concurrency control
   * Not readonly để ORM có thể map vào khi reconstitute từ DB
   */
  version: number;
}
