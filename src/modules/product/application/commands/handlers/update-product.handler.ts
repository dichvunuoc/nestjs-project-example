import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICommandHandler as ICoreCommandHandler } from '@core/application';
import { NotFoundException } from '@core/common';
import { UpdateProductCommand } from '../update-product.command';
import { Inject } from '@nestjs/common';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { Price } from '@modules/product/domain';

/**
 * Update Product Command Handler
 */
@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler
  implements
    ICommandHandler<UpdateProductCommand, void>,
    ICoreCommandHandler<UpdateProductCommand, void>
{
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: UpdateProductCommand): Promise<void> {
    // Load aggregate
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw NotFoundException.entity('Product', command.id);
    }

    // Prepare update data

    const price = command.priceAmount
      ? new Price(command.priceAmount, command.priceCurrency || 'USD')
      : product.price;

    // Update aggregate (domain logic + events)
    product.update({
      name: command.name,
      description: command.description,
      price,
      stock: command.stock,
      category: command.category,
    });

    // Save aggregate (repository will publish domain events)
    await this.productRepository.save(product);
  }
}
