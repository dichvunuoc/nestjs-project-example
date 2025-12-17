// 1. Import từ @core thay vì @nestjs/cqrs
import { QueryHandler } from '@core/decorators';
import { IQueryHandler } from '@core/application';
import { Inject } from '@nestjs/common';

import { GetProductListQuery } from '../get-product-list.query';
import { ProductDto } from '../../dtos';
// Giả sử bạn export interface DAO từ folder ports
import type { IProductReadDao } from '../ports';

// Nên define Token này ở file constants hoặc cùng file interface DAO
// export const PRODUCT_READ_DAO = Symbol('PRODUCT_READ_DAO');

@QueryHandler(GetProductListQuery)
export class GetProductListHandler implements IQueryHandler<
  GetProductListQuery,
  ProductDto[]
> {
  constructor(
    // 2. Inject bằng Token (Nên dùng Symbol/Constant thay vì string cứng)
    @Inject('IProductReadDao')
    private readonly productReadDao: IProductReadDao,
  ) {}

  async execute(query: GetProductListQuery): Promise<ProductDto[]> {
    // 3. Đảm bảo hàm findMany trả về đúng Promise<ProductDto[]>
    return this.productReadDao.findMany({
      page: query.page,
      limit: query.limit,
      category: query.category,
      search: query.search,
    });
  }
}




