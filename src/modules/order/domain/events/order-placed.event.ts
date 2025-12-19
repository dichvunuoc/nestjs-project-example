import { BaseDomainEvent, type IEventMetadata } from 'src/libs/core/domain';

/**
 * Order Placed Event Payload
 */
export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: string;
  metadata?: IEventMetadata;
}

/**
 * Order Placed Event
 *
 * Emitted when a new order is created.
 * Triggers: Stock reservation, notification, analytics
 */
export class OrderPlacedEvent extends BaseDomainEvent<OrderPlacedPayload> {
  constructor(payload: OrderPlacedPayload) {
    super(payload.orderId, 'Order', 'OrderPlaced', payload, payload.metadata);
  }

  get orderId(): string {
    return this.data.orderId;
  }

  get customerId(): string {
    return this.data.customerId;
  }

  get totalAmount(): number {
    return this.data.totalAmount;
  }

  get items(): OrderPlacedPayload['items'] {
    return this.data.items;
  }
}
