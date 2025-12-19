import {
  AggregateRoot,
  ISoftDeletable,
  DomainException,
  IEventMetadata,
} from 'src/libs/core/domain';
import { Price, ProductId } from '../value-objects';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  ProductRenamedEvent,
  ProductPriceChangedEvent,
  StockIncreasedEvent,
  StockDecreasedEvent,
} from '../events';

/**
 * Low stock threshold constant
 * Products with stock below this value are considered "low stock"
 */
export const LOW_STOCK_THRESHOLD = 10;

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

/**
 * Product Aggregate Root
 *
 * Implements DDD Aggregate pattern with:
 * - Encapsulated state with private properties
 * - Business methods with semantic naming (rename, changePrice, etc.)
 * - Domain event emission for each business action
 * - Invariant validation within the aggregate
 *
 * Design Decisions:
 * - NO generic update() method - use semantic methods instead
 * - Each business action emits a specific domain event
 * - Soft delete pattern with restore capability
 */
export class Product extends AggregateRoot implements ISoftDeletable {
  private _props: ProductProps;
  private _deletedAt?: Date | null = null;

  /**
   * Private constructor - use factory methods instead
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

  // --- Soft Delete Implementation ---

  get deletedAt(): Date | null | undefined {
    return this._deletedAt;
  }

  get isDeleted(): boolean {
    return !!this._deletedAt;
  }

  /**
   * Soft delete the product
   * Emits ProductDeletedEvent
   */
  public delete(metadata?: IEventMetadata): void {
    if (this.isDeleted) return;

    this._deletedAt = new Date();
    this.updatedAt = new Date();

    this.addDomainEvent(new ProductDeletedEvent(this.id, metadata));
  }

  /**
   * Restore a soft-deleted product
   */
  public restore(): void {
    if (!this.isDeleted) return;

    this._deletedAt = null;
    this.updatedAt = new Date();
  }

  // --- Factory Methods ---

  /**
   * Factory method: Create new Product
   *
   * @param id Product ID (Value Object)
   * @param props Product properties
   * @param metadata Optional event metadata for distributed tracing (correlationId, userId)
   */
  static create(
    id: ProductId,
    props: Omit<ProductProps, 'isDeleted'>,
    metadata?: IEventMetadata,
  ): Product {
    // 1. Centralized Validation (Guard Clauses)
    this.validateName(props.name);
    this.validateStock(props.stock);
    this.validateCategory(props.category);

    // 2. Create Instance
    const product = new Product(id, { ...props });

    // 3. Emit Domain Event with metadata for distributed tracing
    product.addDomainEvent(
      new ProductCreatedEvent(
        id.value,
        {
          name: props.name,
          description: props.description,
          price: {
            amount: props.price.amount,
            currency: props.price.currency,
          },
          stock: props.stock,
          category: props.category,
        },
        metadata,
      ),
    );

    return product;
  }

  /**
   * Factory method: Reconstitute Product from database
   * Mapper sẽ convert raw DB data thành ProductProps trước khi gọi hàm này
   *
   * Note: Does NOT emit events - this is for hydration only
   */
  static reconstitute(
    id: string,
    props: ProductProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date | null,
  ): Product {
    return new Product(
      new ProductId(id),
      props,
      version,
      createdAt,
      updatedAt,
      deletedAt,
    );
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

  /**
   * Check if product has low stock
   */
  get isLowStock(): boolean {
    return this._props.stock > 0 && this._props.stock < LOW_STOCK_THRESHOLD;
  }

  /**
   * Check if product is out of stock
   */
  get isOutOfStock(): boolean {
    return this._props.stock === 0;
  }

  // --- Business Behaviors (Actions) ---

  /**
   * Rename product
   *
   * Emits: ProductRenamedEvent (semantic event)
   *
   * @param newName New product name
   * @param metadata Optional event metadata for tracing
   */
  rename(newName: string, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    const oldName = this._props.name;
    if (oldName === newName) return;

    Product.validateName(newName);

    this._props.name = newName;
    this.markAsModified();

    // Emit semantic event with both old and new values
    this.addDomainEvent(
      new ProductRenamedEvent(this.id, { oldName, newName }, metadata),
    );
  }

  /**
   * Change product price
   *
   * Emits: ProductPriceChangedEvent (semantic event)
   *
   * @param newPrice New price value object
   * @param metadata Optional event metadata for tracing
   */
  changePrice(newPrice: Price, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    const oldPrice = this._props.price;
    if (oldPrice.equals(newPrice)) return;

    this._props.price = newPrice;
    this.markAsModified();

    // Calculate price change percentage
    const changePercent =
      oldPrice.amount > 0
        ? ((newPrice.amount - oldPrice.amount) / oldPrice.amount) * 100
        : 100;

    // Emit semantic event with price comparison data
    this.addDomainEvent(
      new ProductPriceChangedEvent(
        this.id,
        {
          oldPrice: { amount: oldPrice.amount, currency: oldPrice.currency },
          newPrice: { amount: newPrice.amount, currency: newPrice.currency },
          changePercent: Math.round(changePercent * 100) / 100, // Round to 2 decimals
        },
        metadata,
      ),
    );
  }

  /**
   * Update product information (name, description, category)
   *
   * Use this for admin CRUD operations that update multiple fields.
   * Emits: ProductUpdatedEvent (generic event for multiple field changes)
   *
   * Note: For single field changes, prefer semantic methods:
   * - rename() for name changes
   * - changePrice() for price changes
   *
   * @param params Fields to update
   * @param metadata Optional event metadata for tracing
   */
  updateInfo(
    params: {
      name?: string;
      description?: string;
      category?: string;
    },
    metadata?: IEventMetadata,
  ): void {
    this.ensureNotDeleted();

    const changes: Record<string, unknown> = {};

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
      this.addDomainEvent(new ProductUpdatedEvent(this.id, changes, metadata));
    }
  }

  /**
   * Increase stock (replenishment)
   *
   * Emits: StockIncreasedEvent (semantic event)
   *
   * @param quantity Amount to add to stock
   * @param reason Optional reason for stock increase
   * @param metadata Optional event metadata for tracing
   */
  increaseStock(
    quantity: number,
    reason?: string,
    metadata?: IEventMetadata,
  ): void {
    this.ensureNotDeleted();
    if (quantity <= 0) {
      throw new DomainException('Quantity must be positive');
    }

    const previousStock = this._props.stock;
    this._props.stock += quantity;
    this.markAsModified();

    this.addDomainEvent(
      new StockIncreasedEvent(
        this.id,
        {
          quantity,
          previousStock,
          newStock: this._props.stock,
          reason,
        },
        metadata,
      ),
    );
  }

  /**
   * Decrease stock (sale, adjustment, etc.)
   *
   * Emits: StockDecreasedEvent (semantic event with low/out of stock flags)
   *
   * @param quantity Amount to subtract from stock
   * @param reason Optional reason for stock decrease
   * @param metadata Optional event metadata for tracing
   * @throws DomainException if quantity is invalid or insufficient stock
   */
  decreaseStock(
    quantity: number,
    reason?: string,
    metadata?: IEventMetadata,
  ): void {
    this.ensureNotDeleted();
    if (quantity <= 0) {
      throw new DomainException('Quantity must be positive');
    }

    if (this._props.stock < quantity) {
      throw new DomainException(
        `Insufficient stock. Available: ${this._props.stock}, Requested: ${quantity}`,
      );
    }

    const previousStock = this._props.stock;
    this._props.stock -= quantity;
    this.markAsModified();

    this.addDomainEvent(
      new StockDecreasedEvent(
        this.id,
        {
          quantity,
          previousStock,
          newStock: this._props.stock,
          reason,
          isLowStock: this.isLowStock,
          isOutOfStock: this.isOutOfStock,
        },
        metadata,
      ),
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
