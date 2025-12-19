import { ICommandHandler } from 'src/libs/core/application';
import { DomainException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import {
  BulkStockAdjustmentCommand,
  type StockAdjustmentItem,
} from '../bulk-stock-adjustment.command';
import { type IProductRepository } from '@modules/product/domain/repositories';
import {
  BulkStockAdjustmentService,
  Product,
  type StockAdjustmentResult,
} from '@modules/product/domain';
import { Inject } from '@nestjs/common';
import { PRODUCT_REPOSITORY_TOKEN } from '../../../constants/tokens';

export interface BulkStockAdjustmentResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: StockAdjustmentResult[];
  warnings: string[];
}

/**
 * Bulk Stock Adjustment Command Handler
 */
@CommandHandler(BulkStockAdjustmentCommand)
export class BulkStockAdjustmentHandler implements ICommandHandler<
  BulkStockAdjustmentCommand,
  BulkStockAdjustmentResult
> {
  private readonly bulkStockAdjustmentService: BulkStockAdjustmentService;

  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
  ) {
    this.bulkStockAdjustmentService = new BulkStockAdjustmentService();
  }

  async execute(
    command: BulkStockAdjustmentCommand,
  ): Promise<BulkStockAdjustmentResult> {
    const { adjustments, options } = command;

    const productMap = new Map<string, Product>();
    for (const adjustment of adjustments) {
      if (!productMap.has(adjustment.productId)) {
        try {
          const product = await this.productRepository.getById(
            adjustment.productId,
          );
          if (product) {
            productMap.set(adjustment.productId, product);
          }
        } catch (error) {
          // Will be handled by domain service
        }
      }
    }

    const serviceOptions = {
      maxStockLimit: options?.maxStockLimit,
      minStockThreshold: options?.minStockThreshold,
      allowPartialSuccess: options?.allowPartialSuccess ?? false,
    };

    const { results, warnings, successfulAdjustments, shouldRollback } =
      this.bulkStockAdjustmentService.processBulkAdjustment(
        adjustments,
        productMap,
        serviceOptions,
      );

    if (shouldRollback) {
      this.bulkStockAdjustmentService.rollbackAdjustments(
        successfulAdjustments,
      );

      const failedCount = results.filter((r) => !r.success).length;
      throw new DomainException(
        `Bulk adjustment failed: ${failedCount} adjustments failed`,
      );
    }

    const savedProducts: Array<{
      product: Product;
      adjustment: StockAdjustmentItem;
      previousStock: number;
    }> = [];

    try {
      for (const {
        product,
        adjustment,
        previousStock,
      } of successfulAdjustments) {
        await this.productRepository.save(product);
        savedProducts.push({ product, adjustment, previousStock });
      }

      const successfulCount = results.filter((r) => r.success === true).length;
      return {
        totalRequested: adjustments.length,
        successful: successfulCount,
        failed: results.length - successfulCount,
        results,
        warnings,
      };
    } catch (error) {
      if (savedProducts.length > 0) {
        try {
          this.bulkStockAdjustmentService.rollbackAdjustments(savedProducts);
          for (const { product } of savedProducts) {
            await this.productRepository.save(product);
          }
        } catch (rollbackError) {
          console.error('Failed to rollback after save error:', rollbackError);
        }
      }
      throw error;
    }
  }
}
