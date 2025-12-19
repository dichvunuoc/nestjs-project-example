import { ICommandHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { IncreaseStockCommand } from '../increase-stock.command';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { Inject } from '@nestjs/common';
import { PRODUCT_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Increase Stock Command Handler
 */
@CommandHandler(IncreaseStockCommand)
export class IncreaseStockHandler implements ICommandHandler<
  IncreaseStockCommand,
  void
> {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: IncreaseStockCommand): Promise<void> {
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw NotFoundException.entity('Product', command.id);
    }

    product.increaseStock(command.quantity);

    await this.productRepository.save(product);
  }
}
