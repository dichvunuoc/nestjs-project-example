import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Product Deleted Event Data
 * Empty object as deleted events don't need payload
 */
export type ProductDeletedEventData = Record<string, never>;

/**
 * Product Deleted Domain Event
 *
 * Published when a product is (soft) deleted.
 * The aggregateId contains the deleted product's ID.
 *
 * Event Consumers can:
 * - Mark product as deleted in Read Model
 * - Remove from search index
 * - Notify dependent services
 */
export class ProductDeletedEvent extends BaseDomainEvent<ProductDeletedEventData> {
  constructor(aggregateId: string, metadata?: IEventMetadata) {
    super(aggregateId, 'Product', 'ProductDeleted', {}, metadata);
  }
}
