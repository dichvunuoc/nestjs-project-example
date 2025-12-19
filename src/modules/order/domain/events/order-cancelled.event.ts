import { BaseDomainEvent, type IEventMetadata } from 'src/libs/core/domain';

/**
 * Order Cancelled Event Payload
 */
export interface OrderCancelledPayload {
  orderId: string;
  customerId: string;
  reason: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  metadata?: IEventMetadata;
}

/**
 * Order Cancelled Event
 *
 * Emitted when order is cancelled.
 * Triggers: Stock release, refund processing, notification
 */
export class OrderCancelledEvent extends BaseDomainEvent<OrderCancelledPayload> {
  constructor(payload: OrderCancelledPayload) {
    super(
      payload.orderId,
      'Order',
      'OrderCancelled',
      payload,
      payload.metadata,
    );
  }

  get orderId(): string {
    return this.data.orderId;
  }

  get items(): OrderCancelledPayload['items'] {
    return this.data.items;
  }

  get reason(): string {
    return this.data.reason;
  }
}
