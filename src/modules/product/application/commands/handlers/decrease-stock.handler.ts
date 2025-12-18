import { CommandHandler, ICommandHandler } from '@core';
import { NotFoundException } from '@core/common';
import { DecreaseStockCommand } from '../decrease-stock.command';
import { Inject } from '@nestjs/common';
import { type IProductRepository } from '@modules/product/domain/repositories';

/**
 * Decrease Stock Command Handler
 */
@CommandHandler(DecreaseStockCommand)
export class DecreaseStockHandler implements ICommandHandler<
  DecreaseStockCommand,
  void
> {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: DecreaseStockCommand): Promise<void> {
    // Load aggregate
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw NotFoundException.entity('Product', command.id);
    }

    // Decrease stock (domain logic + events)
    product.decreaseStock(command.quantity);

    // Save aggregate (repository will publish domain events)
    await this.productRepository.save(product);
  }
}
