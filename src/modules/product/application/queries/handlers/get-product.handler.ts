import { IQueryHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { GetProductQuery } from '../get-product.query';
import { ProductDto } from '../../dtos';
import { Inject } from '@nestjs/common';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { PRODUCT_READ_DAO_TOKEN } from '../../../constants/tokens';
import { type IProductReadDao } from '@modules/product/application/queries/ports';

/**
 * Get Product Query Handler
 */
@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<
  GetProductQuery,
  ProductDto
> {
  constructor(
    @Inject(PRODUCT_READ_DAO_TOKEN) private readonly productReadDao: IProductReadDao,
  ) {}

  async execute(query: GetProductQuery): Promise<ProductDto> {
    const product = await this.productReadDao.findById(query.id);

    if (!product) {
      throw NotFoundException.entity('Product', query.id);
    }

    return product;
  }
}
