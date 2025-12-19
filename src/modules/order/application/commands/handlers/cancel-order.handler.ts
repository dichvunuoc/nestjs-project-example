import { Inject, Optional, Logger } from '@nestjs/common';
import type { ICommandHandler } from 'src/libs/core/application';
import type { IUnitOfWork } from 'src/libs/core/infrastructure';
import type { IRequestContextProvider } from 'src/libs/core/common';
import {
  NotFoundException,
  ConflictException,
  BusinessRuleException,
} from 'src/libs/core/common';
import {
  UNIT_OF_WORK_TOKEN,
  REQUEST_CONTEXT_TOKEN,
} from 'src/libs/core/constants';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { CancelOrderCommand } from '../cancel-order.command';
import { ORDER_REPOSITORY_TOKEN } from '../../../constants/tokens';
import type { IOrderRepository } from '../../../domain/repositories';
import type { IProductRepository } from '@modules/product/domain/repositories';
import { PRODUCT_REPOSITORY_TOKEN } from '@modules/product/constants/tokens';
import { OrderStatusEnum } from '../../../domain';

/**
 * Cancel Order Command Handler
 *
 * Demonstrates Saga-like compensating action pattern:
 *
 * ## Compensation Flow (reverse of PlaceOrder):
 * 1. Validate order exists and can be cancelled
 * 2. Within UnitOfWork transaction:
 *    a. For each order item: restore stock (increase product quantity)
 *    b. Update order status to CANCELLED
 *    c. Save all changes atomically
 * 3. If any step fails, entire transaction is rolled back
 *
 * ## Exception Usage:
 * - NotFoundException: Order not found
 * - ConflictException.invalidState(): Order cannot be cancelled (wrong status)
 * - BusinessRuleException: Business rules violation (e.g., already shipped)
 *
 * ## Why this pattern?
 * - Single database: UnitOfWork provides ACID guarantees
 * - Distributed systems: Would use Saga with compensating transactions
 * - This demonstrates the compensation concept in a simpler context
 */
@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<
  CancelOrderCommand,
  void
> {
  private readonly logger = new Logger(CancelOrderHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY_TOKEN)
    private readonly orderRepository: IOrderRepository,
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    this.logger.log(`Cancelling order: ${command.orderId}`);

    // Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    // 1. Validate order exists
    const order = await this.orderRepository.getById(command.orderId);
    if (!order) {
      throw NotFoundException.entity('Order', command.orderId);
    }

    // 2. Validate order can be cancelled (business rule)
    if (!order.status.canTransitionTo(OrderStatusEnum.CANCELLED)) {
      throw ConflictException.invalidState(
        'Order',
        order.status.value,
        'PENDING, CONFIRMED, or PROCESSING',
      );
    }

    // 3. Additional business rule: Cannot cancel shipped orders
    if (order.status.value === OrderStatusEnum.SHIPPED) {
      throw BusinessRuleException.violation(
        'Cannot cancel order that has been shipped. Please contact customer service for return process.',
        {
          orderId: order.id,
          currentStatus: order.status.value,
          shippingAddress: order.shippingAddress,
        },
      );
    }

    // 4. Execute compensation within UnitOfWork
    await this.unitOfWork.runInTransaction(async (txContext) => {
      this.logger.debug(
        `Compensation transaction started: ${txContext.transactionId}`,
        {
          orderId: command.orderId,
          itemCount: order.itemCount,
        },
      );

      // 4a. Restore stock for each item (compensating action)
      const itemsToRestore = order.getItemsForStockReservation();

      for (const item of itemsToRestore) {
        const product = await this.productRepository.getById(item.productId);

        if (!product) {
          // Product might have been deleted - log warning but continue
          this.logger.warn(
            `Product not found for stock restoration: ${item.productId}`,
            {
              orderId: command.orderId,
              quantity: item.quantity,
            },
          );
          continue;
        }

        // Increase stock (reverse of decrease during order placement)
        product.increaseStock(item.quantity);

        // Save within transaction
        await this.productRepository.save(product, {
          transaction: txContext.transaction,
        });

        this.logger.debug(`Stock restored: ${product.name} +${item.quantity}`, {
          productId: product.id,
          newStock: product.stock,
        });
      }

      // 4b. Cancel the order (domain method validates state transition)
      order.cancel(command.reason, eventMetadata);

      // 4c. Save order changes
      await this.orderRepository.save(order, {
        transaction: txContext.transaction,
      });

      this.logger.log(`Order cancelled successfully: ${command.orderId}`, {
        transactionId: txContext.transactionId,
        reason: command.reason,
        itemsRestored: itemsToRestore.length,
      });
    });
  }
}
