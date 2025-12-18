import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { ProductModule } from './product.module';
import { CoreModule } from '@core/core.module';
import { LoggerModule } from '@core/common/logger';
import { MetricsModule } from '@core/common/metrics';
import { ResilienceModule } from '@core/infrastructure/resilience';
import { MessagingModule } from '@core/infrastructure/messaging';
import { HttpClientModule } from '@core/infrastructure/http';
import { TracingModule } from '@core/infrastructure/tracing';

describe('ProductModule Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CoreModule,
        LoggerModule,
        MetricsModule,
        ResilienceModule,
        MessagingModule,
        HttpClientModule,
        TracingModule,
        ProductModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /products', () => {
    it('should create a product', async () => {
      const createDto = {
        name: 'Integration Test Product',
        description: 'Test Description',
        priceAmount: 99.99,
        priceCurrency: 'USD',
        stock: 100,
        category: 'Electronics',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const invalidDto = {
        name: '', // Invalid: empty name
        priceAmount: -10, // Invalid: negative price
      };

      await request(app.getHttpServer())
        .post('/products')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /products/:id', () => {
    it('should get product by id', async () => {
      // First create a product
      const createDto = {
        name: 'Get Test Product',
        description: 'Test',
        priceAmount: 50.00,
        stock: 25,
        category: 'Test',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      const productId = createResponse.body.id;

      // Then get it
      const getResponse = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('id', productId);
      expect(getResponse.body).toHaveProperty('name', createDto.name);
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/products/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /products', () => {
    it('should get product list', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PUT /products/:id', () => {
    it('should update product', async () => {
      // Create product first
      const createDto = {
        name: 'Update Test Product',
        description: 'Test',
        priceAmount: 75.00,
        stock: 30,
        category: 'Test',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      const productId = createResponse.body.id;

      // Update product
      const updateDto = {
        name: 'Updated Product Name',
        description: 'Updated Description',
        priceAmount: 85.00,
        stock: 40,
        category: 'Updated',
      };

      await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(updateDto)
        .expect(200);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product', async () => {
      // Create product first
      const createDto = {
        name: 'Delete Test Product',
        description: 'Test',
        priceAmount: 60.00,
        stock: 20,
        category: 'Test',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      const productId = createResponse.body.id;

      // Delete product
      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(204);
    });
  });

  describe('POST /products/:id/stock/increase', () => {
    it('should increase stock', async () => {
      // Create product first
      const createDto = {
        name: 'Stock Increase Test',
        description: 'Test',
        priceAmount: 100.00,
        stock: 50,
        category: 'Test',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      const productId = createResponse.body.id;

      // Increase stock
      await request(app.getHttpServer())
        .post(`/products/${productId}/stock/increase`)
        .send({ quantity: 10 })
        .expect(200);
    });
  });

  describe('POST /products/:id/stock/decrease', () => {
    it('should decrease stock', async () => {
      // Create product first
      const createDto = {
        name: 'Stock Decrease Test',
        description: 'Test',
        priceAmount: 100.00,
        stock: 50,
        category: 'Test',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      const productId = createResponse.body.id;

      // Decrease stock
      await request(app.getHttpServer())
        .post(`/products/${productId}/stock/decrease`)
        .send({ quantity: 5 })
        .expect(200);
    });
  });

  describe('Correlation ID', () => {
    it('should include correlation ID in response headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('X-Correlation-ID', 'test-correlation-id')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe('test-correlation-id');
    });
  });
});
