import { AggregateRoot, ISoftDeletable } from '@core/domain';
import { DomainException } from '@core/common';
import { Price, ProductId } from '../value-objects';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../events';

/**
 * Interface định nghĩa dữ liệu của Product
 * Giúp constructor và reconstitute gọn gàng hơn
 */
export interface ProductProps {
  name: string;
  description: string;
  price: Price;
  stock: number;
  category: string;
}

export class Product extends AggregateRoot implements ISoftDeletable {
  private _props: ProductProps;

  /**
   * Private constructor
   */
  private constructor(
    id: ProductId,
    props: ProductProps,
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ) {
    super(id.value, version, createdAt, updatedAt);
    this._props = props;
    this._deletedAt = deletedAt;
  }
  private _deletedAt?: Date | null = null;
  get deletedAt(): Date | null | undefined {
    return this._deletedAt;
  }
  get isDeleted(): boolean {
    return !!this._deletedAt;
  }
  public delete(): void {
    if (this.isDeleted) return;

    this._deletedAt = new Date();
    this.updatedAt = new Date();

    // Bắn Event
    this.addDomainEvent(new ProductDeletedEvent(this.id));
  }
  public restore(): void {
    if (!this.isDeleted) return;

    this._deletedAt = null;
    this.updatedAt = new Date();
  }
  /**
   * Factory method: Create new Product
   */
  static create(
    id: ProductId,
    props: Omit<ProductProps, 'isDeleted'>, // Khi create thì chưa có isDeleted
  ): Product {
    // 1. Centralized Validation (Guard Clauses)
    this.validateName(props.name);
    this.validateStock(props.stock);
    this.validateCategory(props.category);

    // 2. Create Instance
    const product = new Product(id, { ...props });

    // 3. Emit Domain Event
    product.addDomainEvent(
      new ProductCreatedEvent(id.value, {
        name: props.name,
        description: props.description,
        price: props.price, // Event nên nhận cả object Price hoặc raw data tùy strategy
        stock: props.stock,
        category: props.category,
      }),
    );

    return product;
  }

  /**
   * Factory method: Reconstitute Product from database
   * Mapper sẽ convert raw DB data thành ProductProps trước khi gọi hàm này
   */
  static reconstitute(
    id: string,
    props: ProductProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
  ): Product {
    return new Product(new ProductId(id), props, version, createdAt, updatedAt);
  }

  update(props: ProductProps): void {
    this._props = props;
    this.markAsModified();
    this.addDomainEvent(new ProductUpdatedEvent(this.id, props));
  }

  // --- Getters (Exposure) ---
  // Trả về primitive types hoặc Value Object (Immutable) để bảo vệ internal state

  get name(): string {
    return this._props.name;
  }
  get description(): string {
    return this._props.description;
  }
  get price(): Price {
    return this._props.price;
  }
  get stock(): number {
    return this._props.stock;
  }
  get category(): string {
    return this._props.category;
  }

  // --- Business Behaviors (Actions) ---

  /**
   * Rename product
   * Tách nhỏ update để rõ ngữ nghĩa (Explicit Intent)
   */
  rename(newName: string): void {
    this.ensureNotDeleted();
    if (this._props.name === newName) return;

    Product.validateName(newName);

    this._props.name = newName;
    this.markAsModified();

    // Semantic Event: ProductRenamedEvent (Hoặc dùng generic Updated kèm field changed)
    this.addDomainEvent(new ProductUpdatedEvent(this.id, { name: newName }));
  }

  /**
   * Update Price
   */
  changePrice(newPrice: Price): void {
    this.ensureNotDeleted();
    if (this._props.price.equals(newPrice)) return;

    this._props.price = newPrice;
    this.markAsModified();

    this.addDomainEvent(
      new ProductUpdatedEvent(this.id, {
        price: { amount: newPrice.amount, currency: newPrice.currency },
      }),
    );
  }

  /**
   * Generic Update (Nếu bắt buộc phải dùng cho CRUD Admin UI)
   * Nhưng đã được refactor để dùng lại validation logic
   */
  updateInfo(params: {
    name?: string;
    description?: string;
    category?: string;
  }): void {
    this.ensureNotDeleted();
    const changes: any = {};

    if (params.name !== undefined && params.name !== this._props.name) {
      Product.validateName(params.name);
      this._props.name = params.name;
      changes.name = params.name;
    }

    if (
      params.description !== undefined &&
      params.description !== this._props.description
    ) {
      this._props.description = params.description;
      changes.description = params.description;
    }

    if (
      params.category !== undefined &&
      params.category !== this._props.category
    ) {
      Product.validateCategory(params.category);
      this._props.category = params.category;
      changes.category = params.category;
    }

    if (Object.keys(changes).length > 0) {
      this.markAsModified();
      this.addDomainEvent(new ProductUpdatedEvent(this.id, changes));
    }
  }

  /**
   * Stock Management
   */
  increaseStock(quantity: number): void {
    this.ensureNotDeleted();
    if (quantity <= 0) throw new DomainException('Quantity must be positive');

    this._props.stock += quantity;
    this.markAsModified();

    this.addDomainEvent(
      new ProductUpdatedEvent(this.id, { stock: this._props.stock }),
    );
  }

  decreaseStock(quantity: number): void {
    this.ensureNotDeleted();
    if (quantity <= 0) throw new DomainException('Quantity must be positive');

    if (this._props.stock < quantity) {
      throw new DomainException('Insufficient stock');
    }

    this._props.stock -= quantity;
    this.markAsModified();

    this.addDomainEvent(
      new ProductUpdatedEvent(this.id, { stock: this._props.stock }),
    );
  }

  // --- Internal Validators (Invariants) ---

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException('Cannot modify deleted product');
    }
  }

  // Static validator để dùng được trong cả factory static method
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainException('Product name is required');
    }
    if (name.length > 200) {
      throw new DomainException('Product name cannot exceed 200 characters');
    }
  }

  private static validateStock(stock: number): void {
    if (stock < 0) {
      throw new DomainException('Product stock cannot be negative');
    }
  }

  private static validateCategory(category: string): void {
    if (!category || category.trim().length === 0) {
      throw new DomainException('Product category is required');
    }
  }
}
