import { CommandHandler, ICommandHandler } from '@core';
import { NotFoundException } from '@core/common';
import { IncreaseStockCommand } from '../increase-stock.command';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { Inject } from '@nestjs/common';

/**
 * Increase Stock Command Handler
 */
@CommandHandler(IncreaseStockCommand)
export class IncreaseStockHandler implements ICommandHandler<
  IncreaseStockCommand,
  void
> {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: IncreaseStockCommand): Promise<void> {
    // Load aggregate
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw NotFoundException.entity('Product', command.id);
    }

    // Increase stock (domain logic + events)
    product.increaseStock(command.quantity);

    // Save aggregate (repository will publish domain events)
    await this.productRepository.save(product);
  }
}
