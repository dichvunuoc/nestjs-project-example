import { IQuery } from 'src/libs/core/application';
import type { OrderReadModel, OrderListFilter } from './ports';

/**
 * Get Order List Response
 */
export interface GetOrderListResult {
  items: OrderReadModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get Order List Query
 *
 * Query to retrieve paginated list of orders with filters.
 * Uses Phantom Type pattern for type inference.
 */
export class GetOrderListQuery extends IQuery<GetOrderListResult> {
  readonly _result!: GetOrderListResult;

  constructor(
    public readonly filter: OrderListFilter = {},
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
  }
}
