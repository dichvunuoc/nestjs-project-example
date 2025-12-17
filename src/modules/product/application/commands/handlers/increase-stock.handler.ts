import { CommandHandler, ICommandHandler } from '@core';
import { IncreaseStockCommand } from '../increase-stock.command';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException(`Product with id "${command.id}" not found`);
    }

    // Increase stock (domain logic + events)
    product.increaseStock(command.quantity);

    // Save aggregate (repository will publish domain events)
    await this.productRepository.save(product);
  }
}
