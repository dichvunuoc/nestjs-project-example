import { Inject, Logger } from '@nestjs/common';
import type { IQueryHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetOrderQuery } from '../get-order.query';
import {
  type IOrderReadDao,
  type OrderReadModel,
} from '../ports';
import { ORDER_READ_DAO_TOKEN } from '../../../constants/tokens';

/**
 * Get Order Query Handler
 *
 * Retrieves a single order from the read model.
 * Uses IOrderReadDao for read-optimized queries.
 */
@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<
  GetOrderQuery,
  OrderReadModel | null
> {
  private readonly logger = new Logger(GetOrderHandler.name);

  constructor(
    @Inject(ORDER_READ_DAO_TOKEN)
    private readonly orderReadDao: IOrderReadDao,
  ) {}

  async execute(query: GetOrderQuery): Promise<OrderReadModel | null> {
    this.logger.debug(`Getting order: ${query.orderId}`);

    const order = await this.orderReadDao.findById(query.orderId);

    if (!order) {
      throw NotFoundException.entity('Order', query.orderId);
    }

    return order;
  }
}
