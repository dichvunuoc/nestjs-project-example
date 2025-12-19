import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Product Updated Event Data (Partial - only changed fields)
 */
export interface ProductUpdatedEventData {
  name?: string;
  description?: string;
  price?: {
    amount: number;
    currency: string;
  };
  stock?: number;
  category?: string;
}

/**
 * Product Updated Domain Event
 *
 * Published when any product property is modified.
 * Data contains only the fields that were changed.
 *
 * Event Consumers can:
 * - Update specific fields in Read Model
 * - Trigger inventory alerts (stock changes)
 * - Sync price changes to external systems
 */
export class ProductUpdatedEvent extends BaseDomainEvent<ProductUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: ProductUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'ProductUpdated', data, metadata);
  }
}
