import { IDomainEvent } from '@core/domain';

/**
 * Product Deleted Domain Event
 * Published when a product is deleted
 */
export class ProductDeletedEvent implements IDomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  data: {};
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };

  constructor(
    aggregateId: string,
    metadata?: {
      userId?: string;
      correlationId?: string;
      causationId?: string;
    },
  ) {
    this.eventId = `${aggregateId}-${Date.now()}`;
    this.eventType = 'ProductDeleted';
    this.aggregateId = aggregateId;
    this.aggregateType = 'Product';
    this.occurredAt = new Date();
    this.data = {};
    this.metadata = metadata;
  }
}




