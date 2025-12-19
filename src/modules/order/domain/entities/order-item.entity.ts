import { BaseEntity, DomainException } from 'src/libs/core/domain';
import { Money } from '../value-objects';

/**
 * Order Item Entity
 *
 * Child entity within Order aggregate.
 * Represents a single line item in an order.
 *
 * Note: This extends BaseEntity, NOT AggregateRoot.
 * Order Items can only be accessed through Order aggregate.
 */
export class OrderItem extends BaseEntity {
  private _productId: string;
  private _productName: string;
  private _unitPrice: Money;
  private _quantity: number;

  private constructor(
    id: string,
    productId: string,
    productName: string,
    unitPrice: Money,
    quantity: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._productId = productId;
    this._productName = productName;
    this._unitPrice = unitPrice;
    this._quantity = quantity;
  }

  /**
   * Factory method to create new Order Item
   */
  static create(
    id: string,
    productId: string,
    productName: string,
    unitPrice: Money,
    quantity: number,
  ): OrderItem {
    // Validate
    if (quantity <= 0) {
      throw new DomainException(
        'Order item quantity must be positive',
        'INVALID_QUANTITY',
        { quantity },
      );
    }

    if (!productId) {
      throw new DomainException(
        'Product ID is required',
        'PRODUCT_ID_REQUIRED',
      );
    }

    return new OrderItem(id, productId, productName, unitPrice, quantity);
  }

  /**
   * Reconstitute from persistence
   */
  static reconstitute(
    id: string,
    productId: string,
    productName: string,
    unitPrice: Money,
    quantity: number,
    createdAt: Date,
    updatedAt: Date,
  ): OrderItem {
    return new OrderItem(
      id,
      productId,
      productName,
      unitPrice,
      quantity,
      createdAt,
      updatedAt,
    );
  }

  // Getters
  get productId(): string {
    return this._productId;
  }

  get productName(): string {
    return this._productName;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get quantity(): number {
    return this._quantity;
  }

  /**
   * Calculate line total
   */
  get lineTotal(): Money {
    return this._unitPrice.multiply(this._quantity);
  }

  /**
   * Update quantity
   */
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new DomainException(
        'Order item quantity must be positive',
        'INVALID_QUANTITY',
        { quantity: newQuantity },
      );
    }
    this._quantity = newQuantity;
    this.updatedAt = new Date();
  }
}
