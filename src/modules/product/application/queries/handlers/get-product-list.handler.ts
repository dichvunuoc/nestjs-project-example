import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { Inject } from '@nestjs/common';
import { PRODUCT_READ_DAO_TOKEN } from '../../../constants/tokens';

import { GetProductListQuery } from '../get-product-list.query';
import { ProductDto } from '../../dtos';
import type { IProductReadDao } from '../ports';

@QueryHandler(GetProductListQuery)
export class GetProductListHandler implements IQueryHandler<
  GetProductListQuery,
  ProductDto[]
> {
  constructor(
    @Inject(PRODUCT_READ_DAO_TOKEN)
    private readonly productReadDao: IProductReadDao,
  ) {}

  async execute(query: GetProductListQuery): Promise<ProductDto[]> {
    return this.productReadDao.findMany({
      page: query.page,
      limit: query.limit,
      category: query.category,
      search: query.search,
    });
  }
}
