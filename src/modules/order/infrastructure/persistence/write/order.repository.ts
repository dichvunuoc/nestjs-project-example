import { Injectable, Inject, Optional } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type {
  IEventBus,
  IOutboxRepository,
} from 'src/libs/core/infrastructure';
import { ConcurrencyException } from 'src/libs/core/common';
import { OUTBOX_REPOSITORY_TOKEN } from 'src/libs/core/constants';
import {
  BaseAggregateRepository,
  SaveOptions,
  EVENT_BUS_TOKEN,
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
  type DrizzleTransaction,
} from 'src/libs/shared';
import { Order, OrderItem, OrderStatusEnum, Money } from '../../../domain';
import { IOrderRepository } from '../../../domain/repositories';
import {
  ordersTable,
  orderItemsTable,
  type OrderRecord,
  type OrderItemRecord,
} from '../drizzle/schema';

/**
 * Order Repository Implementation
 *
 * Implements IOrderRepository using Drizzle ORM.
 * Handles Order aggregate with nested OrderItems.
 */
@Injectable()
export class OrderRepository
  extends BaseAggregateRepository<Order>
  implements IOrderRepository
{
  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN)
    protected readonly eventBus: IEventBus,
    @Optional()
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    outboxRepository?: IOutboxRepository,
  ) {
    super(eventBus, outboxRepository, { useOutbox: !!outboxRepository });
  }

  /**
   * Persist order and items with OCC
   */
  protected async persist(
    aggregate: Order,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const orderRecord = this.toOrderPersistence(aggregate);
    const itemRecords = this.toItemsPersistence(aggregate);

    if (expectedVersion === 0) {
      // INSERT new order
      await db.insert(ordersTable).values(orderRecord);

      // INSERT order items
      if (itemRecords.length > 0) {
        await db.insert(orderItemsTable).values(itemRecords);
      }
    } else {
      // UPDATE order with OCC
      const result = await db
        .update(ordersTable)
        .set(orderRecord)
        .where(
          and(
            eq(ordersTable.id, aggregate.id),
            eq(ordersTable.version, expectedVersion),
          ),
        )
        .returning({ id: ordersTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }

      // Update items: delete existing and re-insert
      await db
        .delete(orderItemsTable)
        .where(eq(orderItemsTable.orderId, aggregate.id));

      if (itemRecords.length > 0) {
        await db.insert(orderItemsTable).values(itemRecords);
      }
    }
  }

  async getById(id: string): Promise<Order | null> {
    const orderResult = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (orderResult.length === 0) {
      return null;
    }

    const itemsResult = await this.db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, id));

    return this.toDomain(orderResult[0], itemsResult);
  }

  async delete(id: string): Promise<void> {
    // Items deleted via cascade
    await this.db.delete(ordersTable).where(eq(ordersTable.id, id));
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const orders = await this.db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.customerId, customerId));

    const result: Order[] = [];
    for (const order of orders) {
      const items = await this.db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order.id));

      result.push(this.toDomain(order, items));
    }

    return result;
  }

  async exists(orderId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    return result.length > 0;
  }

  private toOrderPersistence(aggregate: Order): OrderRecord {
    return {
      id: aggregate.id,
      customerId: aggregate.customerId,
      status: aggregate.status.value,
      totalAmount: aggregate.totalAmount.amount.toString(),
      currency: aggregate.totalAmount.currency,
      shippingAddress: aggregate.shippingAddress,
      version: aggregate.version,
      isDeleted: false,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  private toItemsPersistence(aggregate: Order): OrderItemRecord[] {
    return aggregate.items.map((item) => ({
      id: item.id,
      orderId: aggregate.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice.amount.toString(),
      currency: item.unitPrice.currency,
      quantity: item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  private toDomain(orderRow: OrderRecord, itemRows: OrderItemRecord[]): Order {
    const items = itemRows.map((row) =>
      OrderItem.reconstitute(
        row.id,
        row.productId,
        row.productName,
        new Money(parseFloat(row.unitPrice), row.currency),
        row.quantity,
        row.createdAt,
        row.updatedAt,
      ),
    );

    return Order.reconstitute(
      orderRow.id,
      orderRow.customerId,
      orderRow.status as OrderStatusEnum,
      items,
      new Money(parseFloat(orderRow.totalAmount), orderRow.currency),
      orderRow.shippingAddress,
      orderRow.version,
      orderRow.createdAt,
      orderRow.updatedAt,
    );
  }
}
