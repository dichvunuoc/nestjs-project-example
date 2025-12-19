import { BaseDomainEvent, type IEventMetadata } from 'src/libs/core/domain';

/**
 * Order Confirmed Event Payload
 */
export interface OrderConfirmedPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  metadata?: IEventMetadata;
}

/**
 * Order Confirmed Event
 *
 * Emitted when order is confirmed (stock reserved successfully).
 * Triggers: Payment processing, email notification
 */
export class OrderConfirmedEvent extends BaseDomainEvent<OrderConfirmedPayload> {
  constructor(payload: OrderConfirmedPayload) {
    super(
      payload.orderId,
      'Order',
      'OrderConfirmed',
      payload,
      payload.metadata,
    );
  }

  get orderId(): string {
    return this.data.orderId;
  }

  get customerId(): string {
    return this.data.customerId;
  }
}
