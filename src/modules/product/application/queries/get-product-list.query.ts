import { IQuery } from 'src/libs/core/application';
import { ProductDto } from '../dtos';

/**
 * Get Product List Query
 */
export class GetProductListQuery extends IQuery<ProductDto[]> {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly category?: string,
    public readonly search?: string,
  ) {
    super();
  }
}






