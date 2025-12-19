import { BaseValueObject, DomainException } from 'src/libs/core/domain';

/**
 * Price Value Object
 * Represents monetary value with currency
 */
export class Price extends BaseValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'USD',
  ) {
    super();

    if (amount < 0) {
      throw new DomainException('Price amount cannot be negative');
    }

    if (!currency || currency.trim().length === 0) {
      throw new DomainException('Currency is required');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.amount, this.currency];
  }

  /**
   * Add two prices (must have same currency)
   */
  add(other: Price): Price {
    if (this.currency !== other.currency) {
      throw new DomainException('Cannot add prices with different currencies');
    }
    return new Price(this.amount + other.amount, this.currency);
  }

  /**
   * Multiply price by a factor
   */
  multiply(factor: number): Price {
    return new Price(this.amount * factor, this.currency);
  }

  /**
   * Format price as string
   */
  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}
