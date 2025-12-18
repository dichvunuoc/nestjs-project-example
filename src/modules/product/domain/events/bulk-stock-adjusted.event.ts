import { IDomainEvent } from '@core/domain';
import { randomUUID } from 'crypto';

export interface BulkStockAdjustmentItem {
  productId: string;
  previousStock: number;
  newStock: number;
  quantity: number;
  reason?: string;
}

export interface BulkStockAdjustedEventData {
  adjustments: BulkStockAdjustmentItem[];
  totalRequested: number;
  successful: number;
  failed: number;
  batchReference?: string;
  userId?: string;
}

/**
 * Bulk Stock Adjusted Domain Event
 * Published when a bulk stock adjustment operation completes
 * This event can be used for:
 * - Audit logging
 * - Inventory analytics
 * - Notifications to warehouse systems
 * - Integration with external systems
 */
export class BulkStockAdjustedEvent implements IDomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string; // Can be a batch ID or first product ID
  aggregateType: string;
  occurredAt: Date;
  data: BulkStockAdjustedEventData;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };

  constructor(
    aggregateId: string,
    data: BulkStockAdjustedEventData,
    metadata?: {
      userId?: string;
      correlationId?: string;
      causationId?: string;
    },
  ) {
    this.eventId = randomUUID();
    this.eventType = 'BulkStockAdjusted';
    this.aggregateId = aggregateId;
    this.aggregateType = 'Product';
    this.occurredAt = new Date();
    this.data = data;
    this.metadata = metadata;
  }
}
