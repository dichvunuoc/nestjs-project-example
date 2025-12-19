import { BusinessRuleException } from 'src/libs/core/common';
import { BaseService } from 'src/libs/core/domain';
import type { Money } from '../value-objects';

/**
 * Order Business Rules Configuration
 */
export interface OrderBusinessRules {
  /**
   * Minimum order value to place an order
   */
  minOrderValue?: number;

  /**
   * Maximum items per order
   */
  maxItemsPerOrder?: number;

  /**
   * Maximum quantity per single item
   */
  maxQuantityPerItem?: number;

  /**
   * Currency restrictions (allowed currencies)
   */
  allowedCurrencies?: string[];
}

/**
 * Default business rules
 */
const DEFAULT_RULES: OrderBusinessRules = {
  minOrderValue: 10, // Minimum $10 per order
  maxItemsPerOrder: 50, // Maximum 50 different products
  maxQuantityPerItem: 100, // Maximum 100 units per item
  allowedCurrencies: ['USD', 'EUR', 'GBP', 'VND'],
};

/**
 * Order Validation Service
 *
 * Domain Service that validates complex business rules for orders.
 * Extends BaseService from Core.
 *
 * ## Business Rules Validated:
 * 1. Minimum order value - Orders below threshold are rejected
 * 2. Maximum items per order - Prevent oversized orders
 * 3. Maximum quantity per item - Prevent bulk purchase abuse
 * 4. Currency restrictions - Only allowed currencies
 *
 * ## Exception Strategy:
 * Uses BusinessRuleException (HTTP 400) for business rule violations.
 * This is more semantically correct than generic DomainException.
 *
 * @example
 * ```typescript
 * const validationService = new OrderValidationService(rules);
 *
 * // Validate order before creation
 * validationService.validateOrderRules({
 *   items: orderItems,
 *   totalAmount: calculatedTotal,
 * });
 * ```
 */
export class OrderValidationService extends BaseService {
  private readonly rules: Required<OrderBusinessRules>;

  constructor(customRules?: Partial<OrderBusinessRules>) {
    super();
    this.rules = {
      ...DEFAULT_RULES,
      ...customRules,
    } as Required<OrderBusinessRules>;
  }

  /**
   * Validate all order business rules
   *
   * @throws BusinessRuleException if any rule is violated
   */
  validateOrderRules(params: {
    items: Array<{ productId: string; quantity: number }>;
    totalAmount: Money;
  }): void {
    const violations: string[] = [];

    // Rule 1: Minimum order value
    if (params.totalAmount.amount < this.rules.minOrderValue) {
      violations.push(
        `Order total (${params.totalAmount.amount} ${params.totalAmount.currency}) ` +
          `is below minimum order value (${this.rules.minOrderValue})`,
      );
    }

    // Rule 2: Maximum items per order
    if (params.items.length > this.rules.maxItemsPerOrder) {
      violations.push(
        `Order has ${params.items.length} items, ` +
          `maximum allowed is ${this.rules.maxItemsPerOrder}`,
      );
    }

    // Rule 3: Maximum quantity per item
    const oversizedItems = params.items.filter(
      (item) => item.quantity > this.rules.maxQuantityPerItem,
    );
    if (oversizedItems.length > 0) {
      violations.push(
        `${oversizedItems.length} item(s) exceed maximum quantity (${this.rules.maxQuantityPerItem}): ` +
          oversizedItems.map((i) => `${i.productId}: ${i.quantity}`).join(', '),
      );
    }

    // Rule 4: Currency restrictions
    if (!this.rules.allowedCurrencies.includes(params.totalAmount.currency)) {
      violations.push(
        `Currency '${params.totalAmount.currency}' is not allowed. ` +
          `Allowed: ${this.rules.allowedCurrencies.join(', ')}`,
      );
    }

    // Throw if any violations
    if (violations.length > 0) {
      throw BusinessRuleException.violation(
        `Order placement failed: ${violations.join('; ')}`,
        {
          violations,
          rules: this.rules,
        },
      );
    }
  }

  /**
   * Validate single item quantity
   *
   * @throws BusinessRuleException if quantity exceeds maximum
   */
  validateItemQuantity(productId: string, quantity: number): void {
    if (quantity > this.rules.maxQuantityPerItem) {
      throw BusinessRuleException.violation(
        `Quantity ${quantity} exceeds maximum allowed (${this.rules.maxQuantityPerItem})`,
        {
          productId,
          requestedQuantity: quantity,
          maxAllowed: this.rules.maxQuantityPerItem,
        },
      );
    }

    if (quantity <= 0) {
      throw BusinessRuleException.violation(
        `Quantity must be positive, got: ${quantity}`,
        {
          productId,
          requestedQuantity: quantity,
        },
      );
    }
  }

  /**
   * Validate minimum order value (can be used for preview)
   */
  validateMinimumOrderValue(totalAmount: Money): void {
    if (totalAmount.amount < this.rules.minOrderValue) {
      throw BusinessRuleException.violation(
        `Order total (${totalAmount.amount} ${totalAmount.currency}) is below minimum (${this.rules.minOrderValue})`,
        {
          totalAmount: totalAmount.amount,
          currency: totalAmount.currency,
          minimumRequired: this.rules.minOrderValue,
        },
      );
    }
  }

  /**
   * Get current rules (for client display)
   */
  getRules(): OrderBusinessRules {
    return { ...this.rules };
  }
}
