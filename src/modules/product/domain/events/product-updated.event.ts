import { IDomainEvent } from '@core/domain';
import { randomUUID } from 'crypto';

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
 * Published when a product is updated
 */
export class ProductUpdatedEvent implements IDomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  data: ProductUpdatedEventData;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };

  constructor(
    aggregateId: string,
    data: ProductUpdatedEventData,
    metadata?: {
      userId?: string;
      correlationId?: string;
      causationId?: string;
    },
  ) {
    this.eventId = randomUUID();
    this.eventType = 'ProductUpdated';
    this.aggregateId = aggregateId;
    this.aggregateType = 'Product';
    this.occurredAt = new Date();
    this.data = data;
    this.metadata = metadata;
  }
}
