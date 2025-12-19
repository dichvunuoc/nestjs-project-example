import { ICommandHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { UpdateProductCommand } from '../update-product.command';
import { Inject } from '@nestjs/common';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { PRODUCT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { Price } from '@modules/product/domain';

/**
 * Update Product Command Handler
 */
@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<
  UpdateProductCommand,
  void
> {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: UpdateProductCommand): Promise<void> {
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw NotFoundException.entity('Product', command.id);
    }

    // Update info fields
    product.updateInfo({
      name: command.name,
      description: command.description,
      category: command.category,
    });

    // Update price if provided
    if (command.priceAmount) {
      const newPrice = new Price(
        command.priceAmount,
        command.priceCurrency || 'USD',
      );
      product.changePrice(newPrice);
    }

    // Update stock if provided
    if (command.stock !== undefined) {
      const currentStock = product.stock;
      const stockDifference = command.stock - currentStock;

      if (stockDifference > 0) {
        product.increaseStock(stockDifference, 'update');
      } else if (stockDifference < 0) {
        product.decreaseStock(-stockDifference, 'update');
      }
    }

    await this.productRepository.save(product);
  }
}
