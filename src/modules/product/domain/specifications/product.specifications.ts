import { BaseSpecification } from 'src/libs/core/domain/specifications';
import { Product, LOW_STOCK_THRESHOLD } from '../entities/product.entity';

/**
 * Product In Stock Specification
 *
 * Satisfied when product has stock > 0
 */
export class InStockSpecification extends BaseSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.stock > 0;
  }
}

/**
 * Product Out of Stock Specification
 *
 * Satisfied when product has stock = 0
 */
export class OutOfStockSpecification extends BaseSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.stock === 0;
  }
}

/**
 * Product Low Stock Specification
 *
 * Satisfied when product stock is below threshold but > 0
 *
 * @param threshold - Optional custom threshold (default: LOW_STOCK_THRESHOLD)
 */
export class LowStockSpecification extends BaseSpecification<Product> {
  constructor(private readonly threshold: number = LOW_STOCK_THRESHOLD) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.stock > 0 && product.stock < this.threshold;
  }
}

/**
 * Product Price Below Specification
 *
 * Satisfied when product price is below specified amount
 *
 * @param maxPrice - Maximum price (exclusive)
 */
export class PriceBelowSpecification extends BaseSpecification<Product> {
  constructor(private readonly maxPrice: number) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.price.amount < this.maxPrice;
  }
}

/**
 * Product Price Above Specification
 *
 * Satisfied when product price is above specified amount
 *
 * @param minPrice - Minimum price (exclusive)
 */
export class PriceAboveSpecification extends BaseSpecification<Product> {
  constructor(private readonly minPrice: number) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.price.amount > this.minPrice;
  }
}

/**
 * Product Price Range Specification
 *
 * Satisfied when product price is within specified range (inclusive)
 *
 * @param minPrice - Minimum price
 * @param maxPrice - Maximum price
 */
export class PriceRangeSpecification extends BaseSpecification<Product> {
  constructor(
    private readonly minPrice: number,
    private readonly maxPrice: number,
  ) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return (
      product.price.amount >= this.minPrice &&
      product.price.amount <= this.maxPrice
    );
  }
}

/**
 * Product Category Specification
 *
 * Satisfied when product belongs to specified category
 *
 * @param category - Category name (case-sensitive)
 */
export class CategorySpecification extends BaseSpecification<Product> {
  constructor(private readonly category: string) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.category === this.category;
  }
}

/**
 * Product Not Deleted Specification
 *
 * Satisfied when product is not soft-deleted
 */
export class NotDeletedSpecification extends BaseSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return !product.isDeleted;
  }
}

/**
 * Product Name Contains Specification
 *
 * Satisfied when product name contains specified text (case-insensitive)
 *
 * @param searchText - Text to search for in product name
 */
export class NameContainsSpecification extends BaseSpecification<Product> {
  constructor(private readonly searchText: string) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.name.toLowerCase().includes(this.searchText.toLowerCase());
  }
}

/**
 * Product Sufficient Stock Specification
 *
 * Satisfied when product has enough stock for requested quantity
 *
 * @param requiredQuantity - Quantity needed
 */
export class SufficientStockSpecification extends BaseSpecification<Product> {
  constructor(private readonly requiredQuantity: number) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.stock >= this.requiredQuantity;
  }
}

// --- Composite Specifications (Pre-built) ---

/**
 * Available Product Specification
 *
 * Satisfied when product is:
 * - In stock (stock > 0)
 * - Not deleted
 */
export class AvailableProductSpecification extends BaseSpecification<Product> {
  private readonly inStock = new InStockSpecification();
  private readonly notDeleted = new NotDeletedSpecification();
  private readonly combined = this.inStock.and(this.notDeleted);

  isSatisfiedBy(product: Product): boolean {
    return this.combined.isSatisfiedBy(product);
  }
}

/**
 * Needs Restock Specification
 *
 * Satisfied when product is:
 * - Low stock OR out of stock
 * - Not deleted
 */
export class NeedsRestockSpecification extends BaseSpecification<Product> {
  private readonly lowStock = new LowStockSpecification();
  private readonly outOfStock = new OutOfStockSpecification();
  private readonly notDeleted = new NotDeletedSpecification();
  private readonly combined = this.lowStock
    .or(this.outOfStock)
    .and(this.notDeleted);

  isSatisfiedBy(product: Product): boolean {
    return this.combined.isSatisfiedBy(product);
  }
}
