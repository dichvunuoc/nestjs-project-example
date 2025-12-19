import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BaseProjection, IProjectionLogger } from 'src/libs/core/application';
import { DATABASE_WRITE_TOKEN, type DrizzleDB } from 'src/libs/shared';
import { PRODUCT_READ_DAO_TOKEN } from '../../constants/tokens';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../../domain/events';
import { productsTable } from '../persistence/drizzle/schema';
import { ProductReadDao } from '../persistence/read/product-read-dao';
import { eq } from 'drizzle-orm';

/**
 * NestJS Logger adapter for BaseProjection
 * Adapts NestJS Logger to IProjectionLogger interface
 */
class NestProjectionLogger implements IProjectionLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string): void {
    this.logger.log(message);
  }

  error(message: string, trace?: string): void {
    this.logger.error(message, trace);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }
}

/**
 * Product Read Model Projection
 *
 * Projection là component quan trọng trong CQRS để đồng bộ Read Model
 * khi có Domain Events phát sinh từ Write Side.
 *
 * Trong ví dụ này, chúng ta demo việc:
 * 1. Lắng nghe ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent
 * 2. Update/sync dữ liệu (có thể là cache, search index, denormalized table)
 * 3. Đảm bảo idempotency (không xử lý duplicate events)
 *
 * ## Use Cases cho Projection:
 * - Update Redis cache khi product thay đổi
 * - Sync với Elasticsearch cho full-text search
 * - Update denormalized view table cho complex queries
 * - Send notifications/webhooks
 *
 * ## Idempotency:
 * - Track eventId đã xử lý
 * - Check version trước khi update
 *
 * @example
 * // Khi product được tạo:
 * // 1. Product.create() → ProductCreatedEvent
 * // 2. Repository.save() → Publish event
 * // 3. EventBus → Dispatch to Projection
 * // 4. Projection.handle() → Update cache/search/etc.
 */
@Injectable()
@EventsHandler(ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent)
export class ProductReadModelProjection
  extends BaseProjection<
    ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent
  >
  implements
    IEventHandler<
      ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent
    >
{
  // In-memory event tracking for demo (production should use Redis/DB)
  private processedEvents: Set<string> = new Set();

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(PRODUCT_READ_DAO_TOKEN)
    private readonly productReadDao: ProductReadDao,
  ) {
    super(new NestProjectionLogger('ProductReadModelProjection'));
  }

  /**
   * Main handle method (required by BaseProjection abstract class)
   * This is the actual projection logic that processes events
   */
  async handle(
    event: ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent,
  ): Promise<void> {
    switch (event.eventType) {
      case 'ProductCreated':
        await this.onProductCreated(event as ProductCreatedEvent);
        break;

      case 'ProductUpdated':
        await this.onProductUpdated(event as ProductUpdatedEvent);
        break;

      case 'ProductDeleted':
        await this.onProductDeleted(event as ProductDeletedEvent);
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }

  /**
   * Override để implement idempotency check
   * Production: Dùng Redis SETNX hoặc DB table
   */
  protected async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  /**
   * Override để mark event as processed
   */
  protected async markEventProcessed(eventId: string): Promise<void> {
    this.processedEvents.add(eventId);

    // Cleanup old events (keep last 1000)
    if (this.processedEvents.size > 1000) {
      const eventsArray = Array.from(this.processedEvents);
      this.processedEvents = new Set(eventsArray.slice(-500));
    }
  }

  /**
   * Handle ProductCreatedEvent
   *
   * Khi product được tạo mới, có thể:
   * - Add vào cache
   * - Index vào Elasticsearch
   * - Update aggregate views
   */
  private async onProductCreated(event: ProductCreatedEvent): Promise<void> {
    this.logger.log(
      `Processing ProductCreatedEvent: ${event.aggregateId} - ${event.data.name}`,
    );

    // Demo: Log the event (production would update cache/search index)
    this.logger.debug(
      `New product created: ${JSON.stringify({
        id: event.aggregateId,
        name: event.data.name,
        price: event.data.price,
        category: event.data.category,
        correlationId: event.metadata?.correlationId,
      })}`,
    );

    // Example: Update category product count (pseudo-code)
    // await this.updateCategoryStats(event.data.category, 'increment');

    // Example: Index in Elasticsearch (pseudo-code)
    // await this.searchClient.index({
    //   index: 'products',
    //   id: event.aggregateId,
    //   body: event.data,
    // });
  }

  /**
   * Handle ProductUpdatedEvent
   *
   * Khi product được update:
   * - Invalidate cache entry
   * - Re-index trong search
   * - Update denormalized views
   */
  private async onProductUpdated(event: ProductUpdatedEvent): Promise<void> {
    this.logger.log(`Processing ProductUpdatedEvent: ${event.aggregateId}`);

    this.logger.debug(
      `Product updated: ${JSON.stringify({
        id: event.aggregateId,
        changes: event.data,
        correlationId: event.metadata?.correlationId,
      })}`,
    );

    // Invalidate cache for this product
    await this.productReadDao.invalidateCache(event.aggregateId);

    // Example: Update search index with partial update (pseudo-code)
    // await this.searchClient.update({
    //   index: 'products',
    //   id: event.aggregateId,
    //   body: { doc: event.data.changes },
    // });
  }

  /**
   * Handle ProductDeletedEvent
   *
   * Khi product bị xóa:
   * - Remove khỏi cache
   * - Remove khỏi search index
   * - Update aggregate counts
   */
  private async onProductDeleted(event: ProductDeletedEvent): Promise<void> {
    this.logger.log(`Processing ProductDeletedEvent: ${event.aggregateId}`);

    // Demo: Fetch product info before deletion for logging
    const product = await this.db
      .select({ name: productsTable.name, category: productsTable.category })
      .from(productsTable)
      .where(eq(productsTable.id, event.aggregateId))
      .limit(1);

    if (product.length > 0) {
      this.logger.debug(
        `Product deleted: ${JSON.stringify({
          id: event.aggregateId,
          name: product[0].name,
          category: product[0].category,
          correlationId: event.metadata?.correlationId,
        })}`,
      );

      // Example: Decrement category count (pseudo-code)
      // await this.updateCategoryStats(product[0].category, 'decrement');
    }

    // Remove from cache
    await this.productReadDao.invalidateCache(event.aggregateId);

    // Example: Remove from search index (pseudo-code)
    // await this.searchClient.delete({
    //   index: 'products',
    //   id: event.aggregateId,
    // });
  }
}
