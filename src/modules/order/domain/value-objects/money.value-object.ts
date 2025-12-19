import { BaseValueObject } from 'src/libs/core/domain';
import { DomainException } from 'src/libs/core/domain';

/**
 * Money Value Object
 *
 * Encapsulates monetary values with currency.
 * Supports arithmetic operations with currency validation.
 */
export class Money extends BaseValueObject {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string = 'USD') {
    super();
    this.validate(amount, currency);
    // Round to 2 decimal places
    this._amount = Math.round(amount * 100) / 100;
    this._currency = currency.toUpperCase();
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  private validate(amount: number, currency: string): void {
    if (amount < 0) {
      throw new DomainException(
        'Money amount cannot be negative',
        'INVALID_MONEY_AMOUNT',
        { amount },
      );
    }

    if (!currency || currency.length !== 3) {
      throw new DomainException(
        'Currency must be a 3-letter code',
        'INVALID_CURRENCY',
        { currency },
      );
    }
  }

  /**
   * Add money (must be same currency)
   */
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Multiply by quantity
   */
  multiply(quantity: number): Money {
    if (quantity < 0) {
      throw new DomainException(
        'Quantity cannot be negative',
        'INVALID_QUANTITY',
      );
    }
    return new Money(this._amount * quantity, this._currency);
  }

  /**
   * Create zero money
   */
  static zero(currency: string = 'USD'): Money {
    return new Money(0, currency);
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new DomainException(
        `Cannot operate on different currencies: ${this._currency} vs ${other._currency}`,
        'CURRENCY_MISMATCH',
      );
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this._amount, this._currency];
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }
}
