import { Price } from './price.value-object';
import { DomainException } from '@core/domain';

describe('Price Value Object', () => {
  describe('constructor', () => {
    it('should create a valid price with amount and currency', () => {
      const price = new Price(100, 'USD');

      expect(price.amount).toBe(100);
      expect(price.currency).toBe('USD');
    });

    it('should use USD as default currency', () => {
      const price = new Price(50);

      expect(price.currency).toBe('USD');
    });

    it('should allow zero amount', () => {
      const price = new Price(0, 'USD');

      expect(price.amount).toBe(0);
    });

    it('should throw DomainException for negative amount', () => {
      expect(() => new Price(-10, 'USD')).toThrow(DomainException);
      expect(() => new Price(-10, 'USD')).toThrow(
        'Price amount cannot be negative',
      );
    });

    it('should throw DomainException for empty currency', () => {
      expect(() => new Price(100, '')).toThrow(DomainException);
      expect(() => new Price(100, '')).toThrow('Currency is required');
    });

    it('should throw DomainException for whitespace-only currency', () => {
      expect(() => new Price(100, '   ')).toThrow(DomainException);
    });
  });

  describe('equals', () => {
    it('should return true for same amount and currency', () => {
      const price1 = new Price(100, 'USD');
      const price2 = new Price(100, 'USD');

      expect(price1.equals(price2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const price1 = new Price(100, 'USD');
      const price2 = new Price(200, 'USD');

      expect(price1.equals(price2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const price1 = new Price(100, 'USD');
      const price2 = new Price(100, 'EUR');

      expect(price1.equals(price2)).toBe(false);
    });
  });

  describe('add', () => {
    it('should add two prices with same currency', () => {
      const price1 = new Price(100, 'USD');
      const price2 = new Price(50, 'USD');

      const result = price1.add(price2);

      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
    });

    it('should throw DomainException when adding different currencies', () => {
      const priceUSD = new Price(100, 'USD');
      const priceEUR = new Price(50, 'EUR');

      expect(() => priceUSD.add(priceEUR)).toThrow(DomainException);
      expect(() => priceUSD.add(priceEUR)).toThrow(
        'Cannot add prices with different currencies',
      );
    });
  });

  describe('multiply', () => {
    it('should multiply price by a factor', () => {
      const price = new Price(100, 'USD');

      const result = price.multiply(2);

      expect(result.amount).toBe(200);
      expect(result.currency).toBe('USD');
    });

    it('should handle decimal factors', () => {
      const price = new Price(100, 'USD');

      const result = price.multiply(0.5);

      expect(result.amount).toBe(50);
    });

    it('should handle zero factor', () => {
      const price = new Price(100, 'USD');

      const result = price.multiply(0);

      expect(result.amount).toBe(0);
    });
  });

  describe('toString', () => {
    it('should format price as string', () => {
      const price = new Price(99.99, 'USD');

      expect(price.toString()).toBe('USD 99.99');
    });

    it('should format whole numbers with decimals', () => {
      const price = new Price(100, 'EUR');

      expect(price.toString()).toBe('EUR 100.00');
    });
  });

  describe('immutability', () => {
    it('should be immutable (operations return new instances)', () => {
      const price1 = new Price(100, 'USD');
      const price2 = new Price(50, 'USD');

      const result = price1.add(price2);

      expect(result).not.toBe(price1);
      expect(result).not.toBe(price2);
      expect(price1.amount).toBe(100); // Original unchanged
    });
  });
});
