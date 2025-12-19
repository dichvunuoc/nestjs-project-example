import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, gte, lte, sql, desc, SQL } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
} from 'src/libs/shared';
import type { ICacheService } from 'src/libs/core/infrastructure';
import { CACHE_SERVICE_TOKEN } from 'src/libs/core/constants';
import {
  type IOrderReadDao,
  type OrderReadModel,
  type OrderItemReadModel,
  type OrderListFilter,
} from '../../../application/queries/ports';
import {
  ordersTable,
  orderItemsTable,
  type OrderRecord,
  type OrderItemRecord,
} from '../drizzle/schema';
import { OrderStatusEnum } from '../../../domain';

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'order:';

/**
 * Order Read DAO Implementation
 *
 * Implements IOrderReadDao for read-optimized queries.
 * Extends BaseReadDao for common functionality.
 *
 * ## Features:
 * - Read replica support (via DATABASE_READ_TOKEN)
 * - Optional caching with automatic invalidation
 * - Optimized queries for read operations
 * - Pagination support
 */
@Injectable()
export class OrderReadDao extends BaseReadDao implements IOrderReadDao {
  private readonly logger = new Logger(OrderReadDao.name);

  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB,
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
  ) {
    super();
  }

  /**
   * Execute raw SQL query
   */
  protected async executeQuery<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await this.db.execute(sql);
    return result.rows as T[];
  }

  /**
   * Find order by ID with caching
   */
  async findById(id: string): Promise<OrderReadModel | null> {
    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<OrderReadModel>(
        `${CACHE_KEY_PREFIX}${id}`,
      );
      if (cached) {
        this.logger.debug(`Cache HIT: order ${id}`);
        return cached;
      }
    }

    // Query database
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

    const order = this.toReadModel(orderResult[0], itemsResult);

    // Cache result
    if (this.cacheService && order) {
      await this.cacheService.set(
        `${CACHE_KEY_PREFIX}${id}`,
        order,
        CACHE_TTL_SECONDS,
      );
      this.logger.debug(`Cached order: ${id}`);
    }

    return order;
  }

  /**
   * Find orders by customer ID
   */
  async findByCustomerId(
    customerId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<OrderReadModel[]> {
    return this.findMany({ customerId }, limit, offset);
  }

  /**
   * Find orders with filters and pagination
   */
  async findMany(
    filter: OrderListFilter,
    limit: number = 20,
    offset: number = 0,
  ): Promise<OrderReadModel[]> {
    this.logger.debug('Finding orders', { filter, limit, offset });

    const conditions = this.buildConditions(filter);

    const orders = await this.db
      .select()
      .from(ordersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch items for all orders in batch
    const orderIds = orders.map((o) => o.id);
    const allItems =
      orderIds.length > 0
        ? await this.db
            .select()
            .from(orderItemsTable)
            .where(
              sql`${orderItemsTable.orderId} IN (${sql.join(
                orderIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            )
        : [];

    // Group items by order ID
    const itemsByOrder = this.groupItemsByOrder(allItems);

    return orders.map((order) =>
      this.toReadModel(order, itemsByOrder.get(order.id) || []),
    );
  }

  /**
   * Count orders with filters
   */
  async count(filter: OrderListFilter): Promise<number> {
    const conditions = this.buildConditions(filter);

    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(ordersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return Number(result[0].count) || 0;
  }

  /**
   * Invalidate cache for an order
   */
  async invalidateCache(orderId: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.delete(`${CACHE_KEY_PREFIX}${orderId}`);
      this.logger.debug(`Cache invalidated: order ${orderId}`);
    }
  }

  /**
   * Build WHERE conditions from filter
   */
  private buildConditions(filter: OrderListFilter): SQL[] {
    const conditions: SQL[] = [];

    if (filter.customerId) {
      conditions.push(eq(ordersTable.customerId, filter.customerId));
    }

    if (filter.status) {
      conditions.push(eq(ordersTable.status, filter.status));
    }

    if (filter.fromDate) {
      conditions.push(gte(ordersTable.createdAt, filter.fromDate));
    }

    if (filter.toDate) {
      conditions.push(lte(ordersTable.createdAt, filter.toDate));
    }

    if (filter.minAmount !== undefined) {
      conditions.push(
        gte(sql`CAST(${ordersTable.totalAmount} AS DECIMAL)`, filter.minAmount),
      );
    }

    if (filter.maxAmount !== undefined) {
      conditions.push(
        lte(sql`CAST(${ordersTable.totalAmount} AS DECIMAL)`, filter.maxAmount),
      );
    }

    return conditions;
  }

  /**
   * Group items by order ID
   */
  private groupItemsByOrder(
    items: OrderItemRecord[],
  ): Map<string, OrderItemRecord[]> {
    const map = new Map<string, OrderItemRecord[]>();
    for (const item of items) {
      const existing = map.get(item.orderId) || [];
      existing.push(item);
      map.set(item.orderId, existing);
    }
    return map;
  }

  /**
   * Map persistence record to read model
   */
  private toReadModel(
    order: OrderRecord,
    items: OrderItemRecord[],
  ): OrderReadModel {
    return {
      id: order.id,
      customerId: order.customerId,
      status: order.status as OrderStatusEnum,
      totalAmount: parseFloat(order.totalAmount),
      currency: order.currency,
      shippingAddress: order.shippingAddress,
      itemCount: items.length,
      items: items.map((item) => this.toItemReadModel(item)),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Map item persistence record to read model
   */
  private toItemReadModel(item: OrderItemRecord): OrderItemReadModel {
    const unitPrice = parseFloat(item.unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice,
      currency: item.currency,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  }
}
