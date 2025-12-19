import { Product, ProductProps } from './product.entity';
import { Price, ProductId } from '../value-objects';
import { DomainException } from 'src/libs/core/domain';

describe('Product Entity', () => {
  const createValidProps = (): ProductProps => ({
    name: 'Test Product',
    description: 'A test product description',
    price: new Price(99.99, 'USD'),
    stock: 100,
    category: 'Electronics',
  });

  describe('create', () => {
    it('should create a valid product with all properties', () => {
      const id = new ProductId('prod-123');
      const props = createValidProps();

      const product = Product.create(id, props);

      expect(product.id).toBe('prod-123');
      expect(product.name).toBe('Test Product');
      expect(product.description).toBe('A test product description');
      expect(product.price.amount).toBe(99.99);
      expect(product.price.currency).toBe('USD');
      expect(product.stock).toBe(100);
      expect(product.category).toBe('Electronics');
      expect(product.isDeleted).toBe(false);
    });

    it('should emit ProductCreatedEvent', () => {
      const id = new ProductId('prod-123');
      const props = createValidProps();

      const product = Product.create(id, props);
      const events = product.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProductCreated');
      expect(events[0].aggregateId).toBe('prod-123');
    });

    it('should throw DomainException for empty name', () => {
      const id = new ProductId('prod-123');
      const props = { ...createValidProps(), name: '' };

      expect(() => Product.create(id, props)).toThrow(DomainException);
      expect(() => Product.create(id, props)).toThrow(
        'Product name is required',
      );
    });

    it('should throw DomainException for name exceeding 200 characters', () => {
      const id = new ProductId('prod-123');
      const props = { ...createValidProps(), name: 'a'.repeat(201) };

      expect(() => Product.create(id, props)).toThrow(DomainException);
      expect(() => Product.create(id, props)).toThrow(
        'Product name cannot exceed 200 characters',
      );
    });

    it('should throw DomainException for negative stock', () => {
      const id = new ProductId('prod-123');
      const props = { ...createValidProps(), stock: -1 };

      expect(() => Product.create(id, props)).toThrow(DomainException);
      expect(() => Product.create(id, props)).toThrow(
        'Product stock cannot be negative',
      );
    });

    it('should throw DomainException for empty category', () => {
      const id = new ProductId('prod-123');
      const props = { ...createValidProps(), category: '' };

      expect(() => Product.create(id, props)).toThrow(DomainException);
      expect(() => Product.create(id, props)).toThrow(
        'Product category is required',
      );
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute product from database data', () => {
      const now = new Date();
      const product = Product.reconstitute(
        'prod-123',
        createValidProps(),
        5,
        now,
        now,
      );

      expect(product.id).toBe('prod-123');
      expect(product.version).toBe(5);
      expect(product.createdAt).toBe(now);
      expect(product.getDomainEvents()).toHaveLength(0); // No events on reconstitute
    });
  });

  describe('increaseStock', () => {
    it('should increase stock by given quantity', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();

      product.increaseStock(50);

      expect(product.stock).toBe(150);
    });

    it('should emit ProductUpdatedEvent', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();

      product.increaseStock(50);
      const events = product.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProductUpdated');
    });

    it('should throw DomainException for zero or negative quantity', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );

      expect(() => product.increaseStock(0)).toThrow(DomainException);
      expect(() => product.increaseStock(-10)).toThrow(DomainException);
    });

    it('should throw DomainException if product is deleted', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.delete();

      expect(() => product.increaseStock(50)).toThrow(DomainException);
      expect(() => product.increaseStock(50)).toThrow(
        'Cannot modify deleted product',
      );
    });
  });

  describe('decreaseStock', () => {
    it('should decrease stock by given quantity', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();

      product.decreaseStock(30);

      expect(product.stock).toBe(70);
    });

    it('should throw DomainException for insufficient stock', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );

      expect(() => product.decreaseStock(150)).toThrow(DomainException);
      expect(() => product.decreaseStock(150)).toThrow('Insufficient stock');
    });

    it('should throw DomainException for zero or negative quantity', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );

      expect(() => product.decreaseStock(0)).toThrow(DomainException);
      expect(() => product.decreaseStock(-10)).toThrow(DomainException);
    });
  });

  describe('rename', () => {
    it('should rename the product', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();

      product.rename('New Product Name');

      expect(product.name).toBe('New Product Name');
    });

    it('should not emit event if name is the same', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();

      product.rename('Test Product'); // Same as original

      expect(product.getDomainEvents()).toHaveLength(0);
    });

    it('should validate new name', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );

      expect(() => product.rename('')).toThrow(DomainException);
    });
  });

  describe('changePrice', () => {
    it('should change the product price', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();
      const newPrice = new Price(149.99, 'USD');

      product.changePrice(newPrice);

      expect(product.price.amount).toBe(149.99);
    });

    it('should not emit event if price is the same', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();
      const samePrice = new Price(99.99, 'USD');

      product.changePrice(samePrice);

      expect(product.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should soft delete the product', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();

      product.delete();

      expect(product.isDeleted).toBe(true);
      expect(product.deletedAt).toBeInstanceOf(Date);
    });

    it('should emit ProductDeletedEvent', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.clearDomainEvents();

      product.delete();
      const events = product.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProductDeleted');
    });

    it('should not emit event if already deleted', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.delete();
      product.clearDomainEvents();

      product.delete(); // Try to delete again

      expect(product.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('restore', () => {
    it('should restore a deleted product', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      product.delete();

      product.restore();

      expect(product.isDeleted).toBe(false);
      expect(product.deletedAt).toBeNull();
    });

    it('should do nothing if product is not deleted', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      const originalUpdatedAt = product.updatedAt;

      product.restore();

      expect(product.isDeleted).toBe(false);
      // updatedAt should not change if not deleted
    });
  });

  describe('version and concurrency', () => {
    it('should increment version on modifications', () => {
      const product = Product.create(
        new ProductId('prod-123'),
        createValidProps(),
      );
      const initialVersion = product.version;

      product.increaseStock(10);

      expect(product.version).toBeGreaterThan(initialVersion);
    });
  });
});
