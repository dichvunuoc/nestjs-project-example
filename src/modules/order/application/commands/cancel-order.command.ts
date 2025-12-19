import type { ICommand } from 'src/libs/core/application';

/**
 * Cancel Order Command
 *
 * Command to cancel an existing order.
 * Triggers:
 * - Order status transition to CANCELLED
 * - Stock restoration for all items (compensating action)
 * - OrderCancelledEvent publication
 *
 * ## Saga-like Compensation:
 * This handler demonstrates compensating actions:
 * 1. Find order and its items
 * 2. For each item: increase stock back (reverse of placement)
 * 3. Update order status to CANCELLED
 * 4. All within a single transaction (UnitOfWork)
 */
export class CancelOrderCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
    public readonly cancelledBy?: string,
  ) {}
}
