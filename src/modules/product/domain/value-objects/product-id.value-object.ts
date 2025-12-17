import { BaseValueObject } from '@core/domain';
import { DomainException } from '@core/common';

/**
 * Product ID Value Object
 * Ensures product ID is always valid
 */
export class ProductId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Product ID cannot be empty');
    }

    if (value.length > 50) {
      throw new DomainException('Product ID cannot exceed 50 characters');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}

