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

/**
 * Create Product Command Handler
 *
 * Responsibilities:
 * 1. Validate uniqueness using Domain Service
 * 2. Create Domain Entity via Factory Method
 * 3. Persist via Repository (events auto-published)
 *
 * Note: Business logic (validation, rules) is delegated to Domain Layer.
 * Handler only orchestrates the flow.
 *
 * Request Context Integration:
 * - Injects IRequestContextProvider to access correlation ID, user ID
 * - Domain events include metadata for distributed tracing
 */
@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<
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
  ) {
    // Domain Service instantiated with injected port
    this.uniquenessService = new ProductUniquenessService(uniquenessChecker);
  }

  async execute(command: CreateProductCommand): Promise<string> {
    // 0. Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    // 1. Validate uniqueness via Domain Service
    await this.uniquenessService.ensureNameIsUnique(command.name);

    // 2. Create Value Objects
    const productId = new ProductId(randomUUID());
    const price = new Price(
      command.priceAmount,
      command.priceCurrency || 'USD',
    );

    // 3. Create Aggregate via Factory Method with event metadata
    // All business validation happens inside Product.create()
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

    // 4. Persist (Domain Events auto-published by Repository)
    await this.productRepository.save(product);

    return product.id;
  }
}
