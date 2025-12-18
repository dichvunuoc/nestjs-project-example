import { randomUUID } from 'crypto';
import { CreateProductCommand } from '../create-product.command';
import { DomainException } from '@core/common';
import { Inject } from '@nestjs/common';
import { CommandHandler } from '@core/decorators/command.decorator';
import { ICommandHandler } from '@core/application';
import type { IProductRepository } from '@modules/product/domain/repositories';
import { Price, ProductId } from '@modules/product/domain/value-objects';
import { Product } from '@modules/product/domain';
import { LoggerService } from '@core/common/logger';
import { MetricsService } from '@core/common/metrics';
import { TracingService, SpanKind, SpanStatusCode } from '@core/infrastructure/tracing';
import { MessageBusService } from '@core/infrastructure/messaging';
import { ProductCreatedEvent } from '@modules/product/domain/events';

/**
 * Create Product Command Handler
 *
 * Handlers are in Application layer - they orchestrate domain logic
 * They use repository interface (Port), not implementation (Adapter)
 *
 * Production Features:
 * - Structured logging với correlation ID
 * - Metrics collection
 * - Distributed tracing
 * - Message queue integration
 */
@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<
  CreateProductCommand,
  string
> {
  private productCreatedCounter: any;

  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly tracing: TracingService,
    private readonly messageBus: MessageBusService,
  ) {
    // Set logger context
    this.logger.setContext({ service: 'CreateProductHandler' });

    // Create metrics
    this.productCreatedCounter = metrics.createCounter({
      name: 'products_created_total',
      help: 'Total number of products created',
      labelNames: ['category'],
    });
  }

  async execute(command: CreateProductCommand): Promise<string> {
    // Start tracing span
    const span = this.tracing.startSpan('create-product', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'product.name': command.name,
        'product.category': command.category,
        'product.price': command.priceAmount,
      },
    });

    try {
      this.logger.log('Creating product', 'CreateProductHandler.execute', {
        productName: command.name,
        category: command.category,
      });

      // Check if product name already exists
      const exists = await this.productRepository.existsByName(command.name);
      if (exists) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Product name already exists',
        });
        span.end();
        throw new DomainException(
          `Product with name "${command.name}" already exists`,
        );
      }

      // Create domain aggregate
      const productId = new ProductId(randomUUID());
      const price = new Price(
        command.priceAmount,
        command.priceCurrency || 'USD',
      );

      const product = Product.create(productId, {
        name: command.name,
        description: command.description,
        price,
        stock: command.stock,
        category: command.category,
      });

      // Save aggregate (repository will publish domain events)
      await this.productRepository.save(product);

      // Publish to message queue (in addition to domain events)
      await this.messageBus.publish(
        new ProductCreatedEvent(product.id, {
          name: product.name,
          description: product.description,
          price: { amount: product.price.amount, currency: product.price.currency },
          stock: product.stock,
          category: product.category,
        }),
        {
          exchange: 'domain-events',
          routingKey: 'product.created',
          persistent: true,
        },
      );

      // Increment metric
      this.productCreatedCounter.inc({ category: command.category });

      // Set span attributes
      span.setAttribute('product.id', product.id);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      this.logger.log('Product created successfully', 'CreateProductHandler.execute', {
        productId: product.id,
        productName: product.name,
      });

      return product.id;
    } catch (error) {
      // Log error
      this.logger.error(
        'Failed to create product',
        error instanceof Error ? error.stack : String(error),
        'CreateProductHandler.execute',
        { productName: command.name },
      );

      // Set span status
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.end();

      throw error;
    }
  }
}
