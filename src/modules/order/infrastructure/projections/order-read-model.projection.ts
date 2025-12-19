import { Injectable, Inject, Logger } from '@nestjs/common';
import { IEventHandler } from '@nestjs/cqrs';
import { BaseProjection } from 'src/libs/core/application';
import { EventsHandler } from 'src/libs/shared/cqrs';
import {
  OrderPlacedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
} from '../../domain/events';
import { type IOrderReadDao } from '../../application/queries/ports';
import { ORDER_READ_DAO_TOKEN } from '../../constants/tokens';

/**
 * Order Read Model Projection
 *
 * Extends BaseProjection to handle Order domain events.
 * Responsibilities:
 * 1. Cache invalidation when order changes
 * 2. Structured logging for monitoring/audit
 * 3. Hook points for external systems (search index, notifications)
 *
 * ## Event Flow:
 * OrderPlacedEvent → Log + (Future: notify, index)
 * OrderConfirmedEvent → Invalidate cache + Log + (Future: notify)
 * OrderCancelledEvent → Invalidate cache + Log + (Future: refund, notify)
 *
 * ## Idempotency:
 * Uses in-memory set for demo. Production should use persistent storage.
 */
@Injectable()
@EventsHandler(OrderPlacedEvent, OrderConfirmedEvent, OrderCancelledEvent)
export class OrderReadModelProjection
  extends BaseProjection<
    OrderPlacedEvent | OrderConfirmedEvent | OrderCancelledEvent
  >
  implements
    IEventHandler<OrderPlacedEvent>,
    IEventHandler<OrderConfirmedEvent>,
    IEventHandler<OrderCancelledEvent>
{
  protected readonly logger = new Logger(OrderReadModelProjection.name);
  private processedEvents = new Set<string>();

  constructor(
    @Inject(ORDER_READ_DAO_TOKEN)
    private readonly orderReadDao: IOrderReadDao,
  ) {
    super();
  }

  /**
   * Main event handler dispatcher
   */
  async handle(
    event: OrderPlacedEvent | OrderConfirmedEvent | OrderCancelledEvent,
  ): Promise<void> {
    // Check idempotency (prevent duplicate processing)
    if (await this.hasBeenProcessed(event)) {
      this.logger.debug(`Event already processed: ${event.eventId}`);
      return;
    }

    try {
      // Dispatch to specific handler
      if (event instanceof OrderPlacedEvent) {
        await this.handleOrderPlaced(event);
      } else if (event instanceof OrderConfirmedEvent) {
        await this.handleOrderConfirmed(event);
      } else if (event instanceof OrderCancelledEvent) {
        await this.handleOrderCancelled(event);
      }

      // Mark as processed
      await this.markAsProcessed(event);
    } catch (error) {
      this.logger.error(`Failed to process event: ${event.eventId}`, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Handle OrderPlacedEvent
   */
  private async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    this.logger.log('Order placed', {
      eventId: event.eventId,
      orderId: event.orderId,
      customerId: event.data.customerId,
      totalAmount: event.data.totalAmount,
      currency: event.data.currency,
      itemCount: event.data.itemCount,
      correlationId: event.metadata?.correlationId,
    });

    // Future: Send notification to customer
    // await this.notificationService.sendOrderConfirmation(event);

    // Future: Index in search engine
    // await this.searchService.indexOrder(event);
  }

  /**
   * Handle OrderConfirmedEvent
   */
  private async handleOrderConfirmed(
    event: OrderConfirmedEvent,
  ): Promise<void> {
    // Invalidate cache to ensure fresh data
    await this.orderReadDao.invalidateCache(event.data.orderId);

    this.logger.log('Order confirmed', {
      eventId: event.eventId,
      orderId: event.data.orderId,
      customerId: event.data.customerId,
      totalAmount: event.data.totalAmount,
      correlationId: event.metadata?.correlationId,
    });

    // Future: Send shipping confirmation email
    // await this.notificationService.sendOrderShippingConfirmation(event);
  }

  /**
   * Handle OrderCancelledEvent
   */
  private async handleOrderCancelled(
    event: OrderCancelledEvent,
  ): Promise<void> {
    // Invalidate cache
    await this.orderReadDao.invalidateCache(event.orderId);

    this.logger.log('Order cancelled', {
      eventId: event.eventId,
      orderId: event.orderId,
      customerId: event.data.customerId,
      reason: event.reason,
      itemsRestored: event.items.length,
      correlationId: event.metadata?.correlationId,
    });

    // Future: Process refund
    // await this.paymentService.processRefund(event);

    // Future: Send cancellation notification
    // await this.notificationService.sendOrderCancellation(event);
  }

  /**
   * Check if event has been processed (idempotency)
   * NOTE: In-memory for demo. Use Redis/DB in production.
   */
  protected async hasBeenProcessed(
    event: OrderPlacedEvent | OrderConfirmedEvent | OrderCancelledEvent,
  ): Promise<boolean> {
    return this.processedEvents.has(event.eventId);
  }

  /**
   * Mark event as processed
   */
  protected async markAsProcessed(
    event: OrderPlacedEvent | OrderConfirmedEvent | OrderCancelledEvent,
  ): Promise<void> {
    this.processedEvents.add(event.eventId);

    // Cleanup old events (keep last 1000)
    if (this.processedEvents.size > 1000) {
      const iterator = this.processedEvents.values();
      for (let i = 0; i < 500; i++) {
        const value = iterator.next().value;
        if (value) this.processedEvents.delete(value);
      }
    }
  }
}
