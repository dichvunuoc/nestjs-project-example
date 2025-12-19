/**
 * Specification Pattern Interface
 *
 * Specifications encapsulate business rules that can be:
 * - Combined using AND, OR, NOT operations
 * - Reused across different contexts (validation, querying)
 * - Unit tested in isolation
 *
 * @template T - The type of entity to check against
 *
 * @example
 * ```typescript
 * // Create specifications
 * const inStock = new InStockSpecification();
 * const lowPrice = new PriceBelowSpecification(100);
 *
 * // Combine specifications
 * const affordableInStock = inStock.and(lowPrice);
 *
 * // Use in domain logic
 * if (affordableInStock.isSatisfiedBy(product)) {
 *   // Product is in stock AND price is below $100
 * }
 * ```
 */
export interface ISpecification<T> {
  /**
   * Check if the entity satisfies this specification
   *
   * @param entity - The entity to check
   * @returns true if the entity satisfies the specification
   */
  isSatisfiedBy(entity: T): boolean;

  /**
   * Combine with another specification using AND logic
   *
   * @param other - Another specification to combine with
   * @returns New specification that requires both to be satisfied
   */
  and(other: ISpecification<T>): ISpecification<T>;

  /**
   * Combine with another specification using OR logic
   *
   * @param other - Another specification to combine with
   * @returns New specification that requires either to be satisfied
   */
  or(other: ISpecification<T>): ISpecification<T>;

  /**
   * Negate this specification
   *
   * @returns New specification that is satisfied when this is not
   */
  not(): ISpecification<T>;
}

/**
 * Base Specification class
 *
 * Provides composite operations (and, or, not) using abstract isSatisfiedBy.
 * Subclasses only need to implement the isSatisfiedBy method.
 *
 * @template T - The type of entity to check against
 */
export abstract class BaseSpecification<T> implements ISpecification<T> {
  /**
   * Check if the entity satisfies this specification
   * Must be implemented by subclasses
   */
  abstract isSatisfiedBy(entity: T): boolean;

  /**
   * Combine with another specification using AND logic
   */
  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  /**
   * Combine with another specification using OR logic
   */
  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  /**
   * Negate this specification
   */
  not(): ISpecification<T> {
    return new NotSpecification(this);
  }
}

/**
 * AND Specification - Both must be satisfied
 */
class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity);
  }
}

/**
 * OR Specification - Either must be satisfied
 */
class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity);
  }
}

/**
 * NOT Specification - Must not be satisfied
 */
class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly specification: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return !this.specification.isSatisfiedBy(entity);
  }
}
