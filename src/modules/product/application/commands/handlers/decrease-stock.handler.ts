import { ICommandHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DecreaseStockCommand } from '../decrease-stock.command';
import { Inject } from '@nestjs/common';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { PRODUCT_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Decrease Stock Command Handler
 */
@CommandHandler(DecreaseStockCommand)
export class DecreaseStockHandler implements ICommandHandler<
  DecreaseStockCommand,
  void
> {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: DecreaseStockCommand): Promise<void> {
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw NotFoundException.entity('Product', command.id);
    }

    product.decreaseStock(command.quantity);

    await this.productRepository.save(product);
  }
}
