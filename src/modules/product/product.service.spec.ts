import { Test, TestingModule } from '@nestjs/testing';
import { ProductModule } from './product.module';
import { ProductController } from './infrastructure/http/product.controller';
import { CreateProductHandler } from './application/commands/handlers/create-product.handler';
import { GetProductHandler } from './application/queries/handlers/get-product.handler';
import {
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from '@core';
import { LoggerService } from '@core/common/logger';
import { MetricsService } from '@core/common/metrics';
import { TracingService } from '@core/infrastructure/tracing';
import { MessageBusService } from '@core/infrastructure/messaging';
import { IProductRepository } from './domain/repositories';
import { IProductReadDao } from './application/queries/ports';
import { CreateProductCommand } from './application/commands/create-product.command';
import { GetProductQuery } from './application/queries/get-product.query';
import { NotFoundException } from '@core/common';

describe('ProductModule', () => {
  let module: TestingModule;
  let controller: ProductController;
  let createHandler: CreateProductHandler;
  let getHandler: GetProductHandler;
  let commandBus: any;
  let queryBus: any;
  let logger: LoggerService;
  let metrics: MetricsService;
  let tracing: TracingService;
  let messageBus: MessageBusService;
  let productRepository: IProductRepository;
  let productReadDao: IProductReadDao;

  // Mock implementations
  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockQueryBus = {
    execute: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    setContext: jest.fn(),
    getContext: jest.fn().mockReturnValue({}),
  };

  const mockMetrics = {
    createCounter: jest.fn().mockReturnValue({
      inc: jest.fn(),
    }),
    createGauge: jest.fn().mockReturnValue({
      set: jest.fn(),
      inc: jest.fn(),
      dec: jest.fn(),
    }),
    createHistogram: jest.fn().mockReturnValue({
      observe: jest.fn(),
    }),
    getMetrics: jest.fn().mockResolvedValue(''),
  };

  const mockTracing = {
    startSpan: jest.fn().mockReturnValue({
      setAttribute: jest.fn(),
      setAttributes: jest.fn(),
      addEvent: jest.fn(),
      setStatus: jest.fn(),
      end: jest.fn(),
      spanContext: jest.fn().mockReturnValue({
        traceId: 'test-trace-id',
        spanId: 'test-span-id',
      }),
    }),
    getCurrentSpan: jest.fn(),
    setSpanContext: jest.fn(),
    getSpanContext: jest.fn(),
  };

  const mockMessageBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  };

  const mockProductRepository = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    existsByName: jest.fn().mockResolvedValue(false),
    findAll: jest.fn(),
    delete: jest.fn(),
  };

  const mockProductReadDao = {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByCategory: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ProductModule],
    })
      .overrideProvider(COMMAND_BUS_TOKEN)
      .useValue(mockCommandBus)
      .overrideProvider(QUERY_BUS_TOKEN)
      .useValue(mockQueryBus)
      .overrideProvider(LoggerService)
      .useValue(mockLogger)
      .overrideProvider(MetricsService)
      .useValue(mockMetrics)
      .overrideProvider(TracingService)
      .useValue(mockTracing)
      .overrideProvider(MessageBusService)
      .useValue(mockMessageBus)
      .overrideProvider('IProductRepository')
      .useValue(mockProductRepository)
      .overrideProvider('IProductReadDao')
      .useValue(mockProductReadDao)
      .compile();

    controller = module.get<ProductController>(ProductController);
    createHandler = module.get<CreateProductHandler>(CreateProductHandler);
    getHandler = module.get<GetProductHandler>(GetProductHandler);
    commandBus = module.get(COMMAND_BUS_TOKEN);
    queryBus = module.get(QUERY_BUS_TOKEN);
    logger = module.get<LoggerService>(LoggerService);
    metrics = module.get<MetricsService>(MetricsService);
    tracing = module.get<TracingService>(TracingService);
    messageBus = module.get<MessageBusService>(MessageBusService);
    productRepository = module.get<IProductRepository>('IProductRepository');
    productReadDao = module.get<IProductReadDao>('IProductReadDao');

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('ProductController', () => {
    describe('create', () => {
      it('should create product successfully', async () => {
        const dto = {
          name: 'Test Product',
          description: 'Test Description',
          priceAmount: 99.99,
          priceCurrency: 'USD',
          stock: 100,
          category: 'Electronics',
        };

        const productId = 'test-product-id';
        mockCommandBus.execute.mockResolvedValue(productId);

        const result = await controller.create(dto, 'test-correlation-id');

        expect(result).toEqual({ id: productId });
        expect(mockCommandBus.execute).toHaveBeenCalledWith(
          expect.any(CreateProductCommand),
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Creating product',
          'ProductController.create',
          expect.objectContaining({
            productName: dto.name,
            correlationId: 'test-correlation-id',
          }),
        );
      });

      it('should increment metrics counter', async () => {
        const dto = {
          name: 'Test Product',
          description: 'Test Description',
          priceAmount: 99.99,
          stock: 100,
          category: 'Electronics',
        };

        mockCommandBus.execute.mockResolvedValue('test-id');

        await controller.create(dto, 'test-correlation-id');

        expect(mockMetrics.createCounter).toHaveBeenCalled();
      });
    });

    describe('getById', () => {
      it('should get product by id', async () => {
        const productId = 'test-product-id';
        const productDto = {
          id: productId,
          name: 'Test Product',
          price: 99.99,
        };

        mockQueryBus.execute.mockResolvedValue(productDto);

        const result = await controller.getById(productId, 'test-correlation-id');

        expect(result).toEqual(productDto);
        expect(mockQueryBus.execute).toHaveBeenCalledWith(
          expect.any(GetProductQuery),
        );
      });
    });
  });

  describe('CreateProductHandler', () => {
    describe('execute', () => {
      it('should create product successfully', async () => {
        const command = new CreateProductCommand(
          'Test Product',
          'Test Description',
          99.99,
          'USD',
          100,
          'Electronics',
        );

        mockProductRepository.existsByName.mockResolvedValue(false);
        mockProductRepository.save.mockResolvedValue(undefined);

        const productId = await createHandler.execute(command);

        expect(productId).toBeDefined();
        expect(mockProductRepository.existsByName).toHaveBeenCalledWith(
          command.name,
        );
        expect(mockProductRepository.save).toHaveBeenCalled();
        expect(mockMessageBus.publish).toHaveBeenCalled();
        expect(mockTracing.startSpan).toHaveBeenCalledWith(
          'create-product',
          expect.any(Object),
        );
      });

      it('should throw error if product name exists', async () => {
        const command = new CreateProductCommand(
          'Existing Product',
          'Description',
          99.99,
          'USD',
          100,
          'Electronics',
        );

        mockProductRepository.existsByName.mockResolvedValue(true);

        await expect(createHandler.execute(command)).rejects.toThrow();

        expect(mockProductRepository.save).not.toHaveBeenCalled();
        expect(mockMessageBus.publish).not.toHaveBeenCalled();
      });

      it('should log errors', async () => {
        const command = new CreateProductCommand(
          'Test Product',
          'Description',
          99.99,
          'USD',
          100,
          'Electronics',
        );

        mockProductRepository.existsByName.mockRejectedValue(
          new Error('Database error'),
        );

        await expect(createHandler.execute(command)).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should increment metrics counter', async () => {
        const command = new CreateProductCommand(
          'Test Product',
          'Description',
          99.99,
          'USD',
          100,
          'Electronics',
        );

        mockProductRepository.existsByName.mockResolvedValue(false);
        mockProductRepository.save.mockResolvedValue(undefined);

        await createHandler.execute(command);

        expect(mockMetrics.createCounter).toHaveBeenCalledWith({
          name: 'products_created_total',
          help: 'Total number of products created',
          labelNames: ['category'],
        });
      });
    });
  });

  describe('GetProductHandler', () => {
    describe('execute', () => {
      it('should get product successfully', async () => {
        const query = new GetProductQuery('test-product-id');
        const productDto = {
          id: 'test-product-id',
          name: 'Test Product',
          price: 99.99,
        };

        mockProductReadDao.findById.mockResolvedValue(productDto);

        const result = await getHandler.execute(query);

        expect(result).toEqual(productDto);
        expect(mockProductReadDao.findById).toHaveBeenCalledWith(
          query.id,
        );
        expect(mockTracing.startSpan).toHaveBeenCalledWith(
          'get-product',
          expect.any(Object),
        );
      });

      it('should throw NotFoundException if product not found', async () => {
        const query = new GetProductQuery('non-existent-id');

        mockProductReadDao.findById.mockResolvedValue(null);

        await expect(getHandler.execute(query)).rejects.toThrow(
          NotFoundException,
        );

        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should log errors', async () => {
        const query = new GetProductQuery('test-id');

        mockProductReadDao.findById.mockRejectedValue(
          new Error('Database error'),
        );

        await expect(getHandler.execute(query)).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Integration', () => {
    it('should handle full create and get flow', async () => {
      // Create product
      const createDto = {
        name: 'Integration Test Product',
        description: 'Integration Test',
        priceAmount: 199.99,
        priceCurrency: 'USD',
        stock: 50,
        category: 'Test',
      };

      const productId = 'integration-test-id';
      mockCommandBus.execute.mockResolvedValue(productId);

      const createResult = await controller.create(
        createDto,
        'integration-correlation-id',
      );
      expect(createResult.id).toBe(productId);

      // Get product
      const productDto = {
        id: productId,
        name: createDto.name,
        price: createDto.priceAmount,
      };
      mockQueryBus.execute.mockResolvedValue(productDto);

      const getResult = await controller.getById(
        productId,
        'integration-correlation-id',
      );
      expect(getResult).toEqual(productDto);
    });
  });
});
