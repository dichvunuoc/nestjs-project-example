import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Individual stock adjustment item in a bulk operation
 */
export interface BulkStockAdjustmentItem {
  productId: string;
  previousStock: number;
  newStock: number;
  quantity: number;
  reason?: string;
}

/**
 * Bulk Stock Adjusted Event Data
 */
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
 *
 * Published when a bulk stock adjustment operation completes.
 * Contains summary of all adjustments made in the batch.
 *
 * Event Consumers can:
 * - Audit logging with full adjustment details
 * - Inventory analytics and reporting
 * - Notifications to warehouse systems
 * - Integration with external ERP/WMS systems
 *
 * Note: aggregateId is the batch reference or first product ID
 */
export class BulkStockAdjustedEvent extends BaseDomainEvent<BulkStockAdjustedEventData> {
  constructor(
    aggregateId: string, // Batch ID or first product ID
    data: BulkStockAdjustedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'BulkStockAdjusted', data, metadata);
  }
}
