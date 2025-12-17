import { CommandHandler, ICommandHandler } from '@core';
import { DeleteProductCommand } from '../delete-product.command';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';

/**
 * Delete Product Command Handler
 */
@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<
  DeleteProductCommand,
  void
> {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    // Load aggregate
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw new NotFoundException(`Product with id "${command.id}" not found`);
    }

    // Delete aggregate (domain logic + events)
    product.delete();

    // Save aggregate (repository will publish domain events)
    await this.productRepository.save(product);
  }
}
