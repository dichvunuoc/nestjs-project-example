import type { OrderStatusEnum } from '../../../domain';

/**
 * Order Read Model DTO
 * Optimized for reading, not for domain operations
 */
export interface OrderReadModel {
  id: string;
  customerId: string;
  status: OrderStatusEnum;
  totalAmount: number;
  currency: string;
  shippingAddress: string;
  itemCount: number;
  items: OrderItemReadModel[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Order Item Read Model DTO
 */
export interface OrderItemReadModel {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  lineTotal: number;
}

/**
 * Order List Filter
 */
export interface OrderListFilter {
  customerId?: string;
  status?: OrderStatusEnum;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Order Read DAO Interface (Port)
 *
 * Read-optimized interface for Order queries.
 * Defined in Application Layer, implemented in Infrastructure.
 */
export interface IOrderReadDao {
  /**
   * Find order by ID
   */
  findById(id: string): Promise<OrderReadModel | null>;

  /**
   * Find orders by customer
   */
  findByCustomerId(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<OrderReadModel[]>;

  /**
   * Find orders with filters
   */
  findMany(
    filter: OrderListFilter,
    limit?: number,
    offset?: number,
  ): Promise<OrderReadModel[]>;

  /**
   * Count orders with filters
   */
  count(filter: OrderListFilter): Promise<number>;

  /**
   * Invalidate cache for an order
   */
  invalidateCache(orderId: string): Promise<void>;
}

