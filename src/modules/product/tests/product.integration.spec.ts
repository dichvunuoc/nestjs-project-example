/**
 * Product Module Integration Tests
 *
 * These tests verify the integration between different layers:
 * - Controller → Command/Query Bus → Handler → Repository
 * - Event publishing and projection updates
 * - Caching behavior
 *
 * Note: These tests require a test database.
 * Run with: npm run test:e2e
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import {
  GlobalExceptionFilter,
  ResponseInterceptor,
  GlobalValidationPipe,
} from 'src/libs/shared/http';

describe('ProductModule (Integration)', () => {
  let app: INestApplication;
  let createdProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same global pipes/filters as production
    app.useGlobalPipes(GlobalValidationPipe);
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const createDto = {
        name: `Test Product ${Date.now()}`,
        description: 'Integration test product',
        priceAmount: 99.99,
        priceCurrency: 'USD',
        stock: 100,
        category: 'Electronics',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(typeof response.body.data.id).toBe('string');

      createdProductId = response.body.data.id;
    });

    it('should return 400 for invalid data', async () => {
      const invalidDto = {
        name: '', // Empty name should fail validation
        priceAmount: -10, // Negative price should fail
        stock: 0,
        category: '',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(invalidDto)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate product name', async () => {
      const duplicateDto = {
        name: `Duplicate Test ${Date.now()}`,
        description: 'First product',
        priceAmount: 50,
        stock: 10,
        category: 'Test',
      };

      // Create first product
      await request(app.getHttpServer())
        .post('/products')
        .send(duplicateDto)
        .expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(duplicateDto)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', createdProductId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('price');
      expect(response.body.data.price).toHaveProperty('amount');
      expect(response.body.data.price).toHaveProperty('currency');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /products', () => {
    it('should return paginated product list', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ category: 'Electronics' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // All returned products should have the specified category
      response.body.data.forEach((product: { category: string }) => {
        expect(product.category).toBe('Electronics');
      });
    });
  });

  describe('PUT /products/:id', () => {
    it('should update product', async () => {
      const updateDto = {
        name: `Updated Product ${Date.now()}`,
        description: 'Updated description',
        priceAmount: 149.99,
        priceCurrency: 'USD',
        stock: 50,
        category: 'Electronics',
      };

      await request(app.getHttpServer())
        .put(`/products/${createdProductId}`)
        .send(updateDto)
        .expect(200);

      // Verify update
      const getResponse = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(getResponse.body.data.price.amount).toBe(149.99);
    });
  });

  describe('POST /products/:id/stock/increase', () => {
    it('should increase product stock', async () => {
      // Get current stock
      const beforeResponse = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      const beforeStock = beforeResponse.body.data.stock;

      // Increase stock
      await request(app.getHttpServer())
        .post(`/products/${createdProductId}/stock/increase`)
        .send({ quantity: 25, reason: 'Integration test' })
        .expect(200);

      // Verify increase
      const afterResponse = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(afterResponse.body.data.stock).toBe(beforeStock + 25);
    });
  });

  describe('POST /products/:id/stock/decrease', () => {
    it('should decrease product stock', async () => {
      // Get current stock
      const beforeResponse = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      const beforeStock = beforeResponse.body.data.stock;

      // Decrease stock
      await request(app.getHttpServer())
        .post(`/products/${createdProductId}/stock/decrease`)
        .send({ quantity: 10, reason: 'Integration test' })
        .expect(200);

      // Verify decrease
      const afterResponse = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(afterResponse.body.data.stock).toBe(beforeStock - 10);
    });

    it('should return 400 for insufficient stock', async () => {
      await request(app.getHttpServer())
        .post(`/products/${createdProductId}/stock/decrease`)
        .send({ quantity: 99999 }) // More than available
        .expect(400);
    });
  });

  describe('POST /products/search', () => {
    it('should search products with criteria', async () => {
      const searchCriteria = {
        category: 'Electronics',
        minPrice: 0,
        maxPrice: 1000,
        sortBy: 'price',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/products/search')
        .send(searchCriteria)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /products/stats/summary', () => {
    it('should return product statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/stats/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalProducts');
      expect(response.body.data).toHaveProperty('totalValue');
      expect(response.body.data).toHaveProperty('avgPrice');
      expect(response.body.data).toHaveProperty('lowStockCount');
      expect(response.body.data).toHaveProperty('outOfStockCount');
      expect(response.body.data).toHaveProperty('categoryBreakdown');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should soft delete product', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${createdProductId}`)
        .expect(204);

      // Product should not be found (soft deleted)
      await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(404);
    });
  });

  describe('Specification Pattern Usage', () => {
    it('should demonstrate specification pattern in domain logic', async () => {
      // This test demonstrates that specifications work correctly
      // by creating products and verifying business rules

      // Create a low-stock product
      const lowStockProduct = {
        name: `Low Stock Product ${Date.now()}`,
        description: 'Product with low stock',
        priceAmount: 25.0,
        stock: 5, // Below default threshold of 10
        category: 'Test',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(lowStockProduct)
        .expect(201);

      const productId = createResponse.body.data.id;

      // Verify it appears in low stock list
      const lowStockResponse = await request(app.getHttpServer())
        .get('/products/inventory/low-stock')
        .query({ threshold: 10 })
        .expect(200);

      const foundInLowStock = lowStockResponse.body.data.some(
        (p: any) => p.id === productId,
      );
      expect(foundInLowStock).toBe(true);

      // Cleanup
      await request(app.getHttpServer()).delete(`/products/${productId}`);
    });
  });
});
