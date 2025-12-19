import { IDomainEvent } from '../../../domain/events';

/**
 * Projection interface
 *
 * Projection là thuật ngữ tổng quát trong CQRS/Event Sourcing:
 * - Nhận Domain Event và biến đổi nó thành một trạng thái nào đó
 * - Có thể update SQL, update Redis cache, hay gửi notification
 *
 * Denormalizer là tập con của Projection (projection vào SQL database)
 * Không cần tách riêng interface - chỉ cần tên class cụ thể phân biệt
 *
 * @template TEvent - Type của Domain Event mà projection này xử lý
 */
export interface IProjection<TEvent extends IDomainEvent = IDomainEvent> {
  /**
   * Handle domain event và update Read Model
   * @param event Domain event to handle
   */
  handle(event: TEvent): Promise<void>;

  /**
   * Get projection name cho logging và debugging
   * @returns Projection class name
   */
  getName(): string;
}
