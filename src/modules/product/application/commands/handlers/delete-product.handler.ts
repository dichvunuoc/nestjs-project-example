import { CommandHandler, ICommandHandler } from '@core';
import { NotFoundException } from '@core/common';
import { DeleteProductCommand } from '../delete-product.command';
import { type IProductRepository } from '@modules/product/domain/repositories';
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
      throw NotFoundException.entity('Product', command.id);
    }

    // Delete aggregate (domain logic + events)
    product.delete();

    // Save aggregate (repository will publish domain events)
    await this.productRepository.save(product);
  }
}
