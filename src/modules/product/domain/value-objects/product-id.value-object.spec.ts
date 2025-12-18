import { ProductId } from './product-id.value-object';
import { DomainException } from '@core/domain';

describe('ProductId Value Object', () => {
  describe('constructor', () => {
    it('should create a valid ProductId', () => {
      const id = new ProductId('prod-123');

      expect(id.value).toBe('prod-123');
    });

    it('should accept UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = new ProductId(uuid);

      expect(id.value).toBe(uuid);
    });

    it('should throw DomainException for empty value', () => {
      expect(() => new ProductId('')).toThrow(DomainException);
      expect(() => new ProductId('')).toThrow('Product ID cannot be empty');
    });

    it('should throw DomainException for whitespace-only value', () => {
      expect(() => new ProductId('   ')).toThrow(DomainException);
      expect(() => new ProductId('   ')).toThrow('Product ID cannot be empty');
    });

    it('should throw DomainException for value exceeding 50 characters', () => {
      const longId = 'a'.repeat(51);

      expect(() => new ProductId(longId)).toThrow(DomainException);
      expect(() => new ProductId(longId)).toThrow(
        'Product ID cannot exceed 50 characters',
      );
    });

    it('should accept value with exactly 50 characters', () => {
      const exactId = 'a'.repeat(50);
      const id = new ProductId(exactId);

      expect(id.value).toBe(exactId);
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const id1 = new ProductId('prod-123');
      const id2 = new ProductId('prod-123');

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different values', () => {
      const id1 = new ProductId('prod-123');
      const id2 = new ProductId('prod-456');

      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as string', () => {
      const id = new ProductId('prod-123');

      expect(id.toString()).toBe('prod-123');
    });
  });
});
