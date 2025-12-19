import { Inject, Optional, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ICommandHandler } from 'src/libs/core/application';
import type { IUnitOfWork } from 'src/libs/core/infrastructure';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { NotFoundException, DomainException } from 'src/libs/core/common';
import {
  UNIT_OF_WORK_TOKEN,
  REQUEST_CONTEXT_TOKEN,
} from 'src/libs/core/constants';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { PlaceOrderCommand, type PlaceOrderItem } from '../place-order.command';
import { ORDER_REPOSITORY_TOKEN } from '../../../constants/tokens';
import type { IOrderRepository } from '../../../domain/repositories';
import type { IProductRepository } from '@modules/product/domain/repositories';
import type { Product } from '@modules/product/domain';
import { PRODUCT_REPOSITORY_TOKEN } from '@modules/product/constants/tokens';
import {
  CreateOrderItemProps,
  Money,
  Order,
  OrderId,
} from '@modules/order/domain';

/**
 * Place Order Command Handler
 *
 * Demonstrates IUnitOfWork pattern for multi-aggregate transactions.
 *
 * ## Transaction Flow:
 * 1. Validate all products exist and have sufficient stock
 * 2. Within a single transaction (UnitOfWork):
 *    a. Decrease stock for each product
 *    b. Save all product updates
 *    c. Create and save the order
 * 3. If any step fails, entire transaction is rolled back
 *
 * ## Why UnitOfWork?
 * - Ensures atomicity across multiple aggregates
 * - Prevents partial state changes (e.g., stock decreased but order not created)
 * - Provides isolation from concurrent transactions
 *
 * ## Alternative: Saga Pattern
 * For distributed systems, consider Saga pattern with compensating actions.
 * This handler demonstrates the simpler UnitOfWork approach for single-database.
 */
@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<
  PlaceOrderCommand,
  string
> {
  private readonly logger = new Logger(PlaceOrderHandler.name);

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

  async execute(command: PlaceOrderCommand): Promise<string> {
    this.logger.log(`Placing order for customer: ${command.customerId}`);

    // Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    // 1. Validate and fetch products (outside transaction for read)
    const productMap = await this.fetchAndValidateProducts(command.items);

    // 2. Execute transaction with UnitOfWork
    const orderId = await this.unitOfWork.runInTransaction(
      async (txContext) => {
        this.logger.debug(`Transaction started: ${txContext.transactionId}`, {
          itemCount: command.items.length,
        });

        // 2a. Decrease stock for each product
        const orderItems = await this.reserveStock(
          command.items,
          productMap,
          txContext.transaction,
        );

        // 2b. Create order aggregate
        const orderIdVO = new OrderId(randomUUID());
        const order = Order.create(
          orderIdVO,
          {
            customerId: command.customerId,
            items: orderItems,
            shippingAddress: command.shippingAddress,
          },
          eventMetadata,
        );

        // 2c. Save order (within same transaction)
        await this.orderRepository.save(order, {
          transaction: txContext.transaction,
        });

        this.logger.log(`Order created successfully: ${order.id}`, {
          transactionId: txContext.transactionId,
          totalAmount: order.totalAmount.amount,
          itemCount: order.itemCount,
        });

        return order.id;
      },
    );

    return orderId;
  }

  /**
   * Fetch and validate all products exist with sufficient stock
   */
  private async fetchAndValidateProducts(
    items: PlaceOrderItem[],
  ): Promise<Map<string, Product>> {
    const productMap = new Map<string, Product>();
    const errors: string[] = [];

    // Fetch all products
    for (const item of items) {
      const product = await this.productRepository.getById(item.productId);

      if (!product) {
        errors.push(`Product not found: ${item.productId}`);
        continue;
      }

      if (product.isDeleted) {
        errors.push(`Product is unavailable: ${item.productId}`);
        continue;
      }

      if (product.stock < item.quantity) {
        errors.push(
          `Insufficient stock for ${product.name}: ` +
            `requested ${item.quantity}, available ${product.stock}`,
        );
        continue;
      }

      productMap.set(item.productId, product);
    }

    if (errors.length > 0) {
      throw new DomainException(
        `Cannot place order: ${errors.join('; ')}`,
        'ORDER_VALIDATION_FAILED',
        { errors },
      );
    }

    return productMap;
  }

  /**
   * Reserve stock by decreasing product quantities within transaction
   */
  private async reserveStock(
    items: PlaceOrderItem[],
    productMap: Map<string, Product>,
    transaction: any,
  ): Promise<CreateOrderItemProps[]> {
    const orderItems: CreateOrderItemProps[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw NotFoundException.entity('Product', item.productId);
      }

      // Decrease stock (domain method validates)
      product.decreaseStock(item.quantity);

      // Save product within transaction
      await this.productRepository.save(product, {
        transaction,
      });

      // Create order item props
      orderItems.push({
        id: randomUUID(),
        productId: product.id,
        productName: product.name,
        unitPrice: new Money(product.price.amount, product.price.currency),
        quantity: item.quantity,
      });

      this.logger.debug(`Stock reserved: ${product.name} x ${item.quantity}`, {
        productId: product.id,
        newStock: product.stock,
      });
    }

    return orderItems;
  }
}
