import { BulkStockAdjustmentService } from './bulk-stock-adjustment.service';
import { Product } from '../entities';
import { Price, ProductId } from '../value-objects';
import { DomainException } from '@core/domain';
import type { StockAdjustmentItem } from '../../application/commands/bulk-stock-adjustment.command';

describe('BulkStockAdjustmentService', () => {
  let service: BulkStockAdjustmentService;

  beforeEach(() => {
    service = new BulkStockAdjustmentService();
  });

  const createProduct = (id: string, stock: number): Product => {
    const product = Product.create(new ProductId(id), {
      name: `Product ${id}`,
      description: 'Test product',
      price: new Price(100, 'USD'),
      stock,
      category: 'Test',
    });
    product.clearDomainEvents();
    return product;
  };

  describe('validateProducts', () => {
    it('should validate products exist', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 10 },
        { productId: 'prod-2', quantity: 20 },
      ];
      const productMap = new Map<string, Product>();
      productMap.set('prod-1', createProduct('prod-1', 100));
      productMap.set('prod-2', createProduct('prod-2', 50));

      const result = service.validateProducts(adjustments, productMap);

      expect(result.validProducts.size).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.failedResults).toHaveLength(0);
    });

    it('should report missing products', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 10 },
        { productId: 'prod-missing', quantity: 20 },
      ];
      const productMap = new Map<string, Product>();
      productMap.set('prod-1', createProduct('prod-1', 100));

      const result = service.validateProducts(adjustments, productMap);

      expect(result.validProducts.size).toBe(1);
      expect(result.errors).toContain('Product not found: prod-missing');
      expect(result.failedResults).toHaveLength(1);
      expect(result.failedResults[0].productId).toBe('prod-missing');
      expect(result.failedResults[0].success).toBe(false);
    });

    it('should detect duplicate product IDs in batch', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 10 },
        { productId: 'prod-1', quantity: 20 }, // Duplicate
      ];
      const productMap = new Map<string, Product>();
      productMap.set('prod-1', createProduct('prod-1', 100));

      const result = service.validateProducts(adjustments, productMap);

      expect(result.validProducts.size).toBe(1);
      expect(result.errors).toContain('Duplicate product ID in batch: prod-1');
    });
  });

  describe('validateBusinessRules', () => {
    it('should pass when no max stock limit', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 1000 },
      ];
      const validProducts = new Map<string, Product>();
      validProducts.set('prod-1', createProduct('prod-1', 100));

      const result = service.validateBusinessRules(
        adjustments,
        validProducts,
        {},
      );

      expect(result.validatedProducts.size).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject adjustments exceeding max stock limit', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 1000 },
      ];
      const validProducts = new Map<string, Product>();
      validProducts.set('prod-1', createProduct('prod-1', 100));

      const result = service.validateBusinessRules(adjustments, validProducts, {
        maxStockLimit: 500,
      });

      expect(result.validatedProducts.size).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.failedResults[0].success).toBe(false);
    });

    it('should allow adjustments within max stock limit', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 100 },
      ];
      const validProducts = new Map<string, Product>();
      validProducts.set('prod-1', createProduct('prod-1', 100));

      const result = service.validateBusinessRules(adjustments, validProducts, {
        maxStockLimit: 500,
      });

      expect(result.validatedProducts.size).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('executeAdjustments', () => {
    it('should execute positive adjustments', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 50 },
      ];
      const validatedProducts = new Map<string, Product>();
      validatedProducts.set('prod-1', createProduct('prod-1', 100));

      const result = service.executeAdjustments(
        adjustments,
        validatedProducts,
        {},
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].previousStock).toBe(100);
      expect(result.results[0].newStock).toBe(150);
      expect(result.successfulAdjustments).toHaveLength(1);
    });

    it('should execute negative adjustments', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: -30 },
      ];
      const validatedProducts = new Map<string, Product>();
      validatedProducts.set('prod-1', createProduct('prod-1', 100));

      const result = service.executeAdjustments(
        adjustments,
        validatedProducts,
        {},
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].previousStock).toBe(100);
      expect(result.results[0].newStock).toBe(70);
    });

    it('should fail for insufficient stock', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: -150 },
      ];
      const validatedProducts = new Map<string, Product>();
      validatedProducts.set('prod-1', createProduct('prod-1', 100));

      const result = service.executeAdjustments(
        adjustments,
        validatedProducts,
        {},
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Insufficient stock');
    });

    it('should add warnings for low stock threshold', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: -95 },
      ];
      const validatedProducts = new Map<string, Product>();
      validatedProducts.set('prod-1', createProduct('prod-1', 100));

      const result = service.executeAdjustments(
        adjustments,
        validatedProducts,
        {
          minStockThreshold: 10,
        },
      );

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].newStock).toBe(5);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('below threshold');
    });
  });

  describe('rollbackAdjustments', () => {
    it('should rollback successful adjustments', () => {
      const product = createProduct('prod-1', 100);
      product.increaseStock(50); // Stock is now 150

      const successfulAdjustments = [
        {
          product,
          adjustment: { productId: 'prod-1', quantity: 50 },
          previousStock: 100,
        },
      ];

      service.rollbackAdjustments(successfulAdjustments);

      expect(product.stock).toBe(100); // Should be back to original
    });

    it('should rollback negative adjustments', () => {
      const product = createProduct('prod-1', 100);
      product.decreaseStock(30); // Stock is now 70

      const successfulAdjustments = [
        {
          product,
          adjustment: { productId: 'prod-1', quantity: -30 },
          previousStock: 100,
        },
      ];

      service.rollbackAdjustments(successfulAdjustments);

      expect(product.stock).toBe(100); // Should be back to original
    });
  });

  describe('processBulkAdjustment', () => {
    it('should process bulk adjustments successfully', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 10 },
        { productId: 'prod-2', quantity: -5 },
      ];
      const productMap = new Map<string, Product>();
      productMap.set('prod-1', createProduct('prod-1', 100));
      productMap.set('prod-2', createProduct('prod-2', 50));

      const result = service.processBulkAdjustment(adjustments, productMap, {
        allowPartialSuccess: true,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results.filter((r) => r.success)).toHaveLength(2);
      expect(result.shouldRollback).toBe(false);
    });

    it('should indicate rollback needed when partial success disabled and some fail', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'prod-1', quantity: 10 },
        { productId: 'prod-2', quantity: -100 }, // Will fail - insufficient stock
      ];
      const productMap = new Map<string, Product>();
      productMap.set('prod-1', createProduct('prod-1', 100));
      productMap.set('prod-2', createProduct('prod-2', 50));

      const result = service.processBulkAdjustment(adjustments, productMap, {
        allowPartialSuccess: false,
      });

      expect(result.shouldRollback).toBe(true);
    });

    it('should throw when all products missing and partial success disabled', () => {
      const adjustments: StockAdjustmentItem[] = [
        { productId: 'missing-1', quantity: 10 },
        { productId: 'missing-2', quantity: 20 },
      ];
      const productMap = new Map<string, Product>();

      expect(() =>
        service.processBulkAdjustment(adjustments, productMap, {
          allowPartialSuccess: false,
        }),
      ).toThrow(DomainException);
    });
  });
});
