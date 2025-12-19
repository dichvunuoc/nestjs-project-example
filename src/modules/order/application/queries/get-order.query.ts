import { IQuery } from 'src/libs/core/application';
import type { OrderReadModel } from './ports';

/**
 * Get Order Query
 *
 * Query to retrieve a single order by ID.
 * Uses Phantom Type pattern for type inference.
 */
export class GetOrderQuery extends IQuery<OrderReadModel | null> {
  // Phantom type - never used at runtime, only for type inference
  readonly _result!: OrderReadModel | null;

  constructor(public readonly orderId: string) {
    super();
  }
}
