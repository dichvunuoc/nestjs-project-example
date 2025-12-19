import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Product Created Event Data (Type-safe payload)
 */
export interface ProductCreatedEventData {
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  stock: number;
  category: string;
}

/**
 * Product Created Domain Event
 *
 * Published when a new product is created.
 * Uses BaseDomainEvent for automatic immutability and type-safety.
 *
 * Event Consumers (Projections) can use this to:
 * - Update Read Model database
 * - Send notifications
 * - Update search index
 * - Sync with external systems
 */
export class ProductCreatedEvent extends BaseDomainEvent<ProductCreatedEventData> {
  constructor(
    aggregateId: string,
    data: ProductCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'ProductCreated', data, metadata);
  }
}
