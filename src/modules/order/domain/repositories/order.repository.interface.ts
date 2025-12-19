import { IAggregateRepository } from 'src/libs/core/domain';
import { Order } from '../entities';

/**
 * Order Repository Interface (Port)
 *
 * Extends IAggregateRepository with order-specific queries.
 * Defined in Domain Layer, implemented in Infrastructure.
 */
export interface IOrderRepository extends IAggregateRepository<Order> {
  /**
   * Find orders by customer ID
   */
  findByCustomerId(customerId: string): Promise<Order[]>;

  /**
   * Check if order exists
   */
  exists(orderId: string): Promise<boolean>;
}

