import { BaseValueObject } from 'src/libs/core/domain';
import { DomainException } from 'src/libs/core/domain';

/**
 * Order ID Value Object
 *
 * Encapsulates order identifier with validation.
 * Immutable, equality by value.
 */
export class OrderId extends BaseValueObject {
  private readonly _value: string;

  constructor(value: string) {
    super();
    this.validate(value);
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainException('Order ID cannot be empty', 'INVALID_ORDER_ID');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this._value];
  }

  toString(): string {
    return this._value;
  }
}
