import { IQuery } from '@core/application';
import { ProductDto } from '../dtos';

/**
 * Get Product Query
 * Queries represent read operations
 */
export class GetProductQuery extends IQuery<ProductDto> {
  constructor(public readonly id: string) {
    super();
  }
}
