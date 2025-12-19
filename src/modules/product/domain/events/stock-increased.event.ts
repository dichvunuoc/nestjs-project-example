import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Stock Increased Event Data
 */
export interface StockIncreasedEventData {
  quantity: number;
  previousStock: number;
  newStock: number;
  /** Optional reason for stock increase */
  reason?: string;
}

/**
 * Stock Increased Domain Event
 *
 * Published when product stock is increased (replenishment).
 *
 * Use cases:
 * - Update Read Model inventory
 * - Clear "out of stock" alerts
 * - Update inventory management system
 * - Notify customers who wanted out-of-stock items
 */
export class StockIncreasedEvent extends BaseDomainEvent<StockIncreasedEventData> {
  constructor(
    aggregateId: string,
    data: StockIncreasedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'StockIncreased', data, metadata);
  }
}
