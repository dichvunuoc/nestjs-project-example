import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { IQueryHandler as ICoreQueryHandler } from '@core/application';
import { GetProductQuery } from '../get-product.query';
import { ProductDto } from '../../dtos';
import { NotFoundException, Inject } from '@nestjs/common';
import { type IProductReadDao } from '@modules/product/application/queries/ports';

/**
 * Get Product Query Handler
 *
 * Query handlers use Read DAO (optimized for read operations)
 * They don't load aggregates, just return DTOs
 */
@QueryHandler(GetProductQuery)
export class GetProductHandler
  implements
    IQueryHandler<GetProductQuery, ProductDto>,
    ICoreQueryHandler<GetProductQuery, ProductDto>
{
  constructor(
    @Inject('IProductReadDao') private readonly productReadDao: IProductReadDao,
  ) {}

  async execute(query: GetProductQuery): Promise<ProductDto> {
    const product = await this.productReadDao.findById(query.id);

    if (!product) {
      throw new NotFoundException(`Product with id "${query.id}" not found`);
    }

    return product;
  }
}
