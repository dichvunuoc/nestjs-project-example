import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * Product Renamed Event Data
 */
export interface ProductRenamedEventData {
  oldName: string;
  newName: string;
}

/**
 * Product Renamed Domain Event
 *
 * Published when product name is changed.
 * Semantic event cho phép event consumers xử lý chính xác business action.
 *
 * Use cases:
 * - Update Read Model với tên mới
 * - Notify related systems (e.g., search index)
 * - Audit log cho naming changes
 */
export class ProductRenamedEvent extends BaseDomainEvent<ProductRenamedEventData> {
  constructor(
    aggregateId: string,
    data: ProductRenamedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Product', 'ProductRenamed', data, metadata);
  }
}
