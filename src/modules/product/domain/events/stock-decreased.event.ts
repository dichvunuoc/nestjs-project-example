import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Stock Decreased Event Data
 */
export interface StockDecreasedEventData {
  quantity: number;
  previousStock: number;
  newStock: number;
  /** Optional reason for stock decrease */
  reason?: string;
  /** Flag indicating if stock is now low (below threshold) */
  isLowStock?: boolean;
  /** Flag indicating if product is now out of stock */
  isOutOfStock?: boolean;
}

/**
 * Stock Decreased Domain Event
 *
 * Published when product stock is decreased (order, adjustment, etc.).
 * Includes flags for low stock and out of stock conditions.
 *
 * Use cases:
 * - Update Read Model inventory
 * - Trigger low stock alerts
 * - Trigger out of stock notifications
 * - Update inventory management system
 * - Auto-reorder if below threshold
 */
export class StockDecreasedEvent extends BaseDomainEvent<StockDecreasedEventData> {
  constructor(
    aggregateId: string,
    data: StockDecreasedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'StockDecreased', data, metadata);
  }
}
