import { Inject, Logger } from '@nestjs/common';
import type { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import {
  GetOrderListQuery,
  type GetOrderListResult,
} from '../get-order-list.query';
import { type IOrderReadDao } from '../ports';
import { ORDER_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * Get Order List Query Handler
 *
 * Retrieves paginated list of orders with filters.
 * Uses IOrderReadDao for read-optimized queries.
 */
@QueryHandler(GetOrderListQuery)
export class GetOrderListHandler implements IQueryHandler<
  GetOrderListQuery,
  GetOrderListResult
> {
  private readonly logger = new Logger(GetOrderListHandler.name);

  constructor(
    @Inject(ORDER_READ_DAO_TOKEN)
    private readonly orderReadDao: IOrderReadDao,
  ) {}

  async execute(query: GetOrderListQuery): Promise<GetOrderListResult> {
    this.logger.debug('Getting order list', {
      filter: query.filter,
      page: query.page,
      limit: query.limit,
    });

    const offset = (query.page - 1) * query.limit;

    // Execute queries in parallel for better performance
    const [items, total] = await Promise.all([
      this.orderReadDao.findMany(query.filter, query.limit, offset),
      this.orderReadDao.count(query.filter),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }
}
