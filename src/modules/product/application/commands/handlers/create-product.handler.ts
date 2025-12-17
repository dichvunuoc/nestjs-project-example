import { randomUUID } from 'crypto';
import { CreateProductCommand } from '../create-product.command';
import { DomainException } from '@core/common';
import { Inject } from '@nestjs/common';
import { CommandHandler } from '@core/decorators/command.decorator';
import { ICommandHandler } from '@core/application';
import type { IProductRepository } from '@modules/product/domain/repositories';
import { Price, ProductId } from '@modules/product/domain/value-objects';
import { Product } from '@modules/product/domain';

/**
 * Create Product Command Handler
 *
 * Handlers are in Application layer - they orchestrate domain logic
 * They use repository interface (Port), not implementation (Adapter)
 */
@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<
  CreateProductCommand,
  string
> {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: CreateProductCommand): Promise<string> {
    // Check if product name already exists
    const exists = await this.productRepository.existsByName(command.name);
    if (exists) {
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

    return product.id;
  }
}
