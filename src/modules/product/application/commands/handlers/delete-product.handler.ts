import { ICommandHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DeleteProductCommand } from '../delete-product.command';
import { type IProductRepository } from '@modules/product/domain/repositories';
import { Inject } from '@nestjs/common';
import { PRODUCT_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Delete Product Command Handler
 */
@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<
  DeleteProductCommand,
  void
> {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    const product = await this.productRepository.getById(command.id);
    if (!product) {
      throw NotFoundException.entity('Product', command.id);
    }

    product.delete();

    await this.productRepository.save(product);
  }
}
