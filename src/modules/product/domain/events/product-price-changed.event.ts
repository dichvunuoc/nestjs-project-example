import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Product Price Changed Event Data
 */
export interface ProductPriceChangedEventData {
  oldPrice: {
    amount: number;
    currency: string;
  };
  newPrice: {
    amount: number;
    currency: string;
  };
  /** Percentage change (positive = increase, negative = decrease) */
  changePercent: number;
}

/**
 * Product Price Changed Domain Event
 *
 * Published when product price is modified.
 * Includes both old and new values for comparison and auditing.
 *
 * Use cases:
 * - Update Read Model với giá mới
 * - Trigger price alert notifications
 * - Update pricing history
 * - Sync to external marketplaces
 */
export class ProductPriceChangedEvent extends BaseDomainEvent<ProductPriceChangedEventData> {
  constructor(
    aggregateId: string,
    data: ProductPriceChangedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'ProductPriceChanged', data, metadata);
  }
}
