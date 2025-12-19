import { AggregateRoot, DomainException } from 'src/libs/core/domain';
import type { IEventMetadata } from 'src/libs/core/domain';
import { OrderId, OrderStatus, OrderStatusEnum, Money } from '../value-objects';
import { OrderItem } from './order-item.entity';
import {
  OrderPlacedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
} from '../events';

/**
 * Create Order Item Props
 */
export interface CreateOrderItemProps {
  id: string;
  productId: string;
  productName: string;
  unitPrice: Money;
  quantity: number;
}

/**
 * Create Order Props
 */
export interface CreateOrderProps {
  customerId: string;
  items: CreateOrderItemProps[];
  shippingAddress: string;
  currency?: string;
}

/**
 * Order Aggregate Root
 *
 * Main aggregate for order management.
 * Contains OrderItems as child entities.
 *
 * Responsibilities:
 * - Manage order lifecycle (status transitions)
 * - Calculate order totals
 * - Enforce business rules (min items, stock, etc.)
 * - Emit domain events
 */
export class Order extends AggregateRoot {
  private _orderId: OrderId;
  private _customerId: string;
  private _status: OrderStatus;
  private _items: OrderItem[];
  private _totalAmount: Money;
  private _shippingAddress: string;

  private constructor(
    id: string,
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, version, createdAt, updatedAt);
    this._items = [];
  }

  /**
   * Factory method to create new Order
   */
  static create(
    orderId: OrderId,
    props: CreateOrderProps,
    metadata?: IEventMetadata,
  ): Order {
    // Validate
    if (!props.customerId) {
      throw new DomainException(
        'Customer ID is required',
        'CUSTOMER_ID_REQUIRED',
      );
    }

    if (!props.items || props.items.length === 0) {
      throw new DomainException(
        'Order must have at least one item',
        'ORDER_ITEMS_REQUIRED',
      );
    }

    if (!props.shippingAddress || props.shippingAddress.trim().length === 0) {
      throw new DomainException(
        'Shipping address is required',
        'SHIPPING_ADDRESS_REQUIRED',
      );
    }

    // Create order with initial values
    const order = new Order(orderId.value);
    order._orderId = orderId;
    order._customerId = props.customerId;
    order._status = OrderStatus.pending();
    order._shippingAddress = props.shippingAddress;

    // Create order items
    const currency = props.currency || 'USD';
    for (const itemProps of props.items) {
      const item = OrderItem.create(
        itemProps.id,
        itemProps.productId,
        itemProps.productName,
        itemProps.unitPrice,
        itemProps.quantity,
      );
      order._items.push(item);
    }

    // Calculate total
    order._totalAmount = order.calculateTotal(currency);

    // Emit domain event
    order.addDomainEvent(
      new OrderPlacedEvent({
        orderId: order.id,
        customerId: order._customerId,
        totalAmount: order._totalAmount.amount,
        currency: order._totalAmount.currency,
        itemCount: order._items.length,
        items: order._items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.amount,
        })),
        shippingAddress: order._shippingAddress,
        metadata,
      }),
    );

    return order;
  }

  /**
   * Reconstitute from persistence
   */
  static reconstitute(
    id: string,
    customerId: string,
    status: OrderStatusEnum,
    items: OrderItem[],
    totalAmount: Money,
    shippingAddress: string,
    version: number,
    createdAt: Date,
    updatedAt: Date,
  ): Order {
    const order = new Order(id, version, createdAt, updatedAt);
    order._orderId = new OrderId(id);
    order._customerId = customerId;
    order._status = new OrderStatus(status);
    order._items = items;
    order._totalAmount = totalAmount;
    order._shippingAddress = shippingAddress;
    return order;
  }

  // Getters
  get orderId(): OrderId {
    return this._orderId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get items(): readonly OrderItem[] {
    return [...this._items];
  }

  get totalAmount(): Money {
    return this._totalAmount;
  }

  get shippingAddress(): string {
    return this._shippingAddress;
  }

  get itemCount(): number {
    return this._items.length;
  }

  /**
   * Calculate order total from items
   */
  private calculateTotal(currency: string): Money {
    return this._items.reduce(
      (total, item) => total.add(item.lineTotal),
      Money.zero(currency),
    );
  }

  /**
   * Confirm order (after stock reserved)
   */
  confirm(metadata?: IEventMetadata): void {
    if (!this._status.canTransitionTo(OrderStatusEnum.CONFIRMED)) {
      throw new DomainException(
        `Cannot confirm order in ${this._status.value} status`,
        'INVALID_ORDER_OPERATION',
      );
    }

    this._status = this._status.transitionTo(OrderStatusEnum.CONFIRMED);

    this.addDomainEvent(
      new OrderConfirmedEvent({
        orderId: this.id,
        customerId: this._customerId,
        totalAmount: this._totalAmount.amount,
        currency: this._totalAmount.currency,
        metadata,
      }),
    );
  }

  /**
   * Cancel order
   */
  cancel(reason: string, metadata?: IEventMetadata): void {
    if (!this._status.canTransitionTo(OrderStatusEnum.CANCELLED)) {
      throw new DomainException(
        `Cannot cancel order in ${this._status.value} status`,
        'INVALID_ORDER_OPERATION',
      );
    }

    this._status = this._status.transitionTo(OrderStatusEnum.CANCELLED);

    this.addDomainEvent(
      new OrderCancelledEvent({
        orderId: this.id,
        customerId: this._customerId,
        reason,
        items: this._items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        metadata,
      }),
    );
  }

  /**
   * Get product IDs and quantities (for stock reservation)
   */
  getItemsForStockReservation(): Array<{
    productId: string;
    quantity: number;
  }> {
    return this._items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }
}
