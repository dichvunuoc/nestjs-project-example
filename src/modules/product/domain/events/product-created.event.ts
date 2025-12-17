import { IDomainEvent } from '@core/domain';

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
 * Published when a new product is created
 */
export class ProductCreatedEvent implements IDomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  data: ProductCreatedEventData;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };

  constructor(
    aggregateId: string,
    data: ProductCreatedEventData,
    metadata?: {
      userId?: string;
      correlationId?: string;
      causationId?: string;
    },
  ) {
    this.eventId = `${aggregateId}-${Date.now()}`;
    this.eventType = 'ProductCreated';
    this.aggregateId = aggregateId;
    this.aggregateType = 'Product';
    this.occurredAt = new Date();
    this.data = data;
    this.metadata = metadata;
  }
}

