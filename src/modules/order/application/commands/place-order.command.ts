import type { ICommand } from 'src/libs/core/application';

/**
 * Place Order Command Item
 */
export interface PlaceOrderItem {
  productId: string;
  quantity: number;
}

/**
 * Place Order Command
 *
 * Command to create a new order.
 * Triggers:
 * - Order aggregate creation
 * - Stock deduction from Product aggregates (via UnitOfWork)
 * - Domain events publication
 */
export class PlaceOrderCommand implements ICommand {
  constructor(
    public readonly customerId: string,
    public readonly items: PlaceOrderItem[],
    public readonly shippingAddress: string,
  ) {}
}
