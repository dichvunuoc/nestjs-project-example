import { QueryHandler } from '@core/decorators/query.decorator';
import { IQueryHandler } from '@core/application';
import { GetProductQuery } from '../get-product.query';
import { Inject } from '@nestjs/common';
import type { IProductReadDao } from '../ports';
import { NotFoundException } from '@core/common';
import { LoggerService } from '@core/common/logger';
import { TracingService, SpanKind, SpanStatusCode } from '@core/infrastructure/tracing';
import { ProductDto } from '../../dtos';

/**
 * Get Product Query Handler
 *
 * Handles read operations - returns DTOs, not domain entities
 *
 * Production Features:
 * - Structured logging
 * - Distributed tracing
 */
@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<
  GetProductQuery,
  ProductDto
> {
  constructor(
    @Inject('IProductReadDao')
    private readonly productReadDao: IProductReadDao,
    private readonly logger: LoggerService,
    private readonly tracing: TracingService,
  ) {
    this.logger.setContext({ service: 'GetProductHandler' });
  }

  async execute(query: GetProductQuery): Promise<ProductDto> {
    const span = this.tracing.startSpan('get-product', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'product.id': query.id,
      },
    });

    try {
      this.logger.debug('Getting product', 'GetProductHandler.execute', {
        productId: query.id,
      });

      const product = await this.productReadDao.findById(query.id);

      if (!product) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Product not found',
        });
        span.end();
        throw NotFoundException.entity('Product', query.id);
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      this.logger.debug('Product retrieved', 'GetProductHandler.execute', {
        productId: query.id,
      });

      return product;
    } catch (error) {
      this.logger.error(
        'Failed to get product',
        error instanceof Error ? error.stack : String(error),
        'GetProductHandler.execute',
        { productId: query.id },
      );

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.end();

      throw error;
    }
  }
}
