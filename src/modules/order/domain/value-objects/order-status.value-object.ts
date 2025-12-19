import { BaseValueObject } from 'src/libs/core/domain';
import { DomainException } from 'src/libs/core/domain';

/**
 * Order Status Enum
 */
export enum OrderStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

/**
 * Valid Status Transitions
 */
const VALID_TRANSITIONS: Record<OrderStatusEnum, OrderStatusEnum[]> = {
  [OrderStatusEnum.PENDING]: [
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.CONFIRMED]: [
    OrderStatusEnum.PROCESSING,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.PROCESSING]: [
    OrderStatusEnum.SHIPPED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.SHIPPED]: [OrderStatusEnum.DELIVERED],
  [OrderStatusEnum.DELIVERED]: [],
  [OrderStatusEnum.CANCELLED]: [],
};

/**
 * Order Status Value Object
 *
 * Encapsulates order status with state machine validation.
 * Ensures only valid status transitions are allowed.
 */
export class OrderStatus extends BaseValueObject {
  private readonly _value: OrderStatusEnum;

  constructor(value: OrderStatusEnum) {
    super();
    this._value = value;
  }

  get value(): OrderStatusEnum {
    return this._value;
  }

  /**
   * Create initial pending status
   */
  static pending(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PENDING);
  }

  /**
   * Check if transition to new status is valid
   */
  canTransitionTo(newStatus: OrderStatusEnum): boolean {
    return VALID_TRANSITIONS[this._value].includes(newStatus);
  }

  /**
   * Transition to new status with validation
   */
  transitionTo(newStatus: OrderStatusEnum): OrderStatus {
    if (!this.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Invalid status transition from ${this._value} to ${newStatus}`,
        'INVALID_ORDER_STATUS_TRANSITION',
        {
          currentStatus: this._value,
          requestedStatus: newStatus,
          validTransitions: VALID_TRANSITIONS[this._value],
        },
      );
    }
    return new OrderStatus(newStatus);
  }

  isPending(): boolean {
    return this._value === OrderStatusEnum.PENDING;
  }

  isConfirmed(): boolean {
    return this._value === OrderStatusEnum.CONFIRMED;
  }

  isCancelled(): boolean {
    return this._value === OrderStatusEnum.CANCELLED;
  }

  isDelivered(): boolean {
    return this._value === OrderStatusEnum.DELIVERED;
  }

  protected getEqualityComponents(): unknown[] {
    return [this._value];
  }

  toString(): string {
    return this._value;
  }
}
