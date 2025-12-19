import { randomUUID } from 'crypto';
import { CreateProductCommand } from '../create-product.command';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { Inject, Optional } from '@nestjs/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import type { IProductRepository } from '@modules/product/domain/repositories';
import { Price, ProductId } from '@modules/product/domain/value-objects';
import { Product } from '@modules/product/domain';
import {
  ProductUniquenessService,
  type IProductUniquenessChecker,
} from '@modules/product/domain/services';
import {
  PRODUCT_REPOSITORY_TOKEN,
  PRODUCT_UNIQUENESS_CHECKER_TOKEN,
} from '../../../constants/tokens';

// Enhanced imports for new features
import {
  RequirePermission,
  AuditLogCreation,
  SensitiveOperation,
} from 'src/libs/shared/security';
import { Retry } from 'src/libs/shared/resilience/retry.decorator';
import { CircuitBreaker } from 'src/libs/shared/resilience/circuit-breaker.decorator';
import { StructuredLogger } from 'src/libs/shared/observability/structured-logger.service';
import type { Tracer } from '@opentelemetry/api';
import {
  BusinessRuleViolationException,
  DuplicateResourceException,
} from 'src/libs/shared/errors/domain-exception.base';

/**
 * Enhanced Create Product Command Handler
 *
 * Demonstrates integration of all new architectural improvements:
 * - Security: RBAC permissions and audit logging
 * - Observability: Distributed tracing and structured logging
 * - Resilience: Retry and circuit breaker patterns
 * - Error Handling: Domain exceptions with proper error codes
 *
 * Security Features:
 * - Requires 'product:create' permission
 * - Audit logged as sensitive operation
 * - Input validation with Zod schema (if applied)
 *
 * Observability Features:
 * - Distributed tracing with OpenTelemetry
 * - Structured logging with correlation ID
 * - Performance metrics collection
 * - Business event logging
 *
 * Resilience Features:
 * - Retry on transient failures
 * - Circuit breaker for repository operations
 * - Fallback strategies for external calls
 *
 * Error Handling Features:
 * - Domain-specific exceptions
 * - User-friendly error messages
 * - Structured error responses
 * - Error code standardization
 */
@CommandHandler(CreateProductCommand)
@RequirePermission('product:create')
@AuditLogCreation('product')
@SensitiveOperation({
  category: 'system',
  security: { requireMFA: false },
  retention: { days: 365, immutable: true },
})
@Retry({
  maxAttempts: 2,
  initialDelayMs: 500,
  retryableErrors: ['DatabaseConnectionError'],
})
@CircuitBreaker({
  timeout: 10000,
  errorThreshold: 20,
  resetTimeout: 30000,
  fallback: () => {
    throw new BusinessRuleViolationException(
      'PRODUCT_CREATION_TEMPORARILY_UNAVAILABLE',
      'Product creation is temporarily unavailable. Please try again later.',
      {
        userMessage:
          "We're experiencing technical difficulties. Please try again in a few minutes.",
        suggestedAction: 'Wait a moment and try again',
      },
    );
  },
})
export class EnhancedCreateProductHandler implements ICommandHandler<
  CreateProductCommand,
  string
> {
  private readonly uniquenessService: ProductUniquenessService;

  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_UNIQUENESS_CHECKER_TOKEN)
    uniquenessChecker: IProductUniquenessChecker,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
    @Optional()
    private readonly logger?: StructuredLogger,
    @Optional()
    private readonly tracer?: Tracer,
  ) {
    // Domain Service instantiated with injected port
    this.uniquenessService = new ProductUniquenessService(uniquenessChecker);
  }

  async execute(command: CreateProductCommand): Promise<string> {
    const startTime = Date.now();
    const span = this.tracer?.startSpan('EnhancedCreateProductHandler.execute');

    try {
      // Get request context for distributed tracing and security
      const context = this.requestContext?.current();
      const eventMetadata = context
        ? {
            correlationId: context.correlationId,
            causationId: context.causationId,
            userId: context.userId,
          }
        : undefined;

      // Structured logging - operation start
      this.logger?.logOperationStart('CreateProduct', {
        command: {
          name: command.name,
          category: command.category,
          // Don't log sensitive data like full details
        },
        user: context?.userId ? { id: context.userId } : undefined,
      });

      // Step 1: Validate uniqueness via Domain Service
      this.logger?.debug('Validating product uniqueness', {
        operation: {
          name: 'CreateProduct.validateUniqueness',
          type: 'validation',
        },
        data: { name: command.name },
      });

      await this.uniquenessService.ensureNameIsUnique(command.name);

      // Step 2: Create Value Objects
      this.logger?.debug('Creating value objects', {
        operation: {
          name: 'CreateProduct.createValueObjects',
          type: 'creation',
        },
      });

      const productId = new ProductId(randomUUID());
      const price = new Price(
        command.priceAmount,
        command.priceCurrency || 'USD',
      );

      // Step 3: Create Aggregate via Factory Method with event metadata
      this.logger?.debug('Creating product aggregate', {
        operation: { name: 'CreateProduct.createAggregate', type: 'creation' },
        business: {
          entity: 'Product',
          action: 'create',
          entityId: productId.value,
        },
      });

      const product = Product.create(
        productId,
        {
          name: command.name,
          description: command.description,
          price,
          stock: command.stock,
          category: command.category,
        },
        eventMetadata,
      );

      // Step 4: Persist (Domain Events auto-published by Repository)
      this.logger?.debug('Persisting product aggregate', {
        operation: { name: 'CreateProduct.persist', type: 'persistence' },
        business: {
          entity: 'Product',
          action: 'persist',
          entityId: product.id,
        },
      });

      await this.productRepository.save(product);

      // Structured logging - operation success
      this.logger?.logOperationEnd('CreateProduct', startTime, {
        productId: product.id,
        name: product.name,
        category: product.category,
      });

      // Business metrics (if metrics collector is available)
      this.logger?.info('Product created successfully', {
        business: {
          entity: 'Product',
          action: 'created',
          entityId: product.id,
          category: product.category,
          stock: product.stock,
          price: {
            amount: product.price.amount,
            currency: product.price.currency,
          },
        },
        operation: {
          name: 'CreateProduct',
          type: 'command',
          duration: Date.now() - startTime,
        },
        user: context?.userId ? { id: context.userId } : undefined,
      });

      span?.setAttributes({
        'product.id': product.id,
        'product.name': product.name,
        'product.category': product.category,
        'operation.success': true,
      });

      return product.id;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Enhanced error handling with domain-specific exceptions
      if (error instanceof DuplicateResourceException) {
        this.logger?.warn('Product creation failed - duplicate name', {
          operation: { name: 'CreateProduct', type: 'creation' },
          duration,
          data: {
            name: command.name,
            error: error.message,
          },
        });

        throw new DuplicateResourceException('Product', command.name, {
          userMessage: 'A product with this name already exists',
          suggestedAction: 'Please choose a different name',
        });
      }

      if (error instanceof BusinessRuleViolationException) {
        this.logger?.warn('Product creation failed - business rule violation', {
          operation: { name: 'CreateProduct', type: 'creation' },
          duration,
          data: {
            name: command.name,
            rule: error.errorCode,
            error: error.message,
          },
        });

        throw error;
      }

      // Generic error handling
      this.logger?.error('Product creation failed', error as Error, {
        operation: { name: 'CreateProduct', type: 'creation' },
        duration,
        data: {
          name: command.name,
          category: command.category,
        },
      });

      span?.recordException(error as Error);
      span?.setAttributes({
        'operation.success': false,
        'error.type': error.constructor.name,
        'error.message': (error as Error).message,
      });

      // Re-throw with additional context
      throw new BusinessRuleViolationException(
        'PRODUCT_CREATION_FAILED',
        `Failed to create product: ${(error as Error).message}`,
        {
          userMessage: 'Unable to create product at this time',
          context: { originalError: error },
          suggestedAction: 'Please check your input and try again',
        },
      );
    } finally {
      span?.end();
    }
  }
}
