import { DomainException } from './domain.exception';

/**
 * Business Rule Exception
 * Alias for DomainException - represents business rule violations
 * HTTP Status: 400 (Bad Request)
 *
 * Use this when you want to be explicit about business rule violations
 * For consistency, you can also use DomainException directly
 */
export class BusinessRuleException extends DomainException {
  constructor(
    message: string,
    code: string = 'BUSINESS_RULE_VIOLATION',
    details?: any,
  ) {
    super(message, code, details);
  }

  /**
   * Static factory method for business rule violation
   */
  static violation(rule: string, details?: any): BusinessRuleException {
    return new BusinessRuleException(
      `Business rule violated: ${rule}`,
      'BUSINESS_RULE_VIOLATION',
      { rule, ...details },
    );
  }
}
