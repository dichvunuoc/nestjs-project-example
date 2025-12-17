import { CommandHandler, ICommandHandler } from '@core';
import { DomainException } from '@core/common';
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

/**
 * Bulk Stock Adjustment Result
 */
export interface BulkStockAdjustmentResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: StockAdjustmentResult[];
  warnings: string[];
}

/**
 * Bulk Stock Adjustment Command Handler
 *
 * Application Layer Handler - chỉ orchestrate, không chứa business logic
 * Business logic được xử lý bởi Domain Service (BulkStockAdjustmentService)
 *
 * Handler responsibilities:
 * 1. Load aggregates từ repository
 * 2. Gọi domain service để xử lý business logic
 * 3. Save aggregates sau khi xử lý
 * 4. Handle rollback nếu cần
 * 5. Return results
 */
@CommandHandler(BulkStockAdjustmentCommand)
export class BulkStockAdjustmentHandler implements ICommandHandler<
  BulkStockAdjustmentCommand,
  BulkStockAdjustmentResult
> {
  private readonly bulkStockAdjustmentService: BulkStockAdjustmentService;

  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {
    // Domain Service là pure TypeScript, không cần inject
    this.bulkStockAdjustmentService = new BulkStockAdjustmentService();
  }

  async execute(
    command: BulkStockAdjustmentCommand,
  ): Promise<BulkStockAdjustmentResult> {
    const { adjustments, options } = command;

    // Step 1: Load all products from repository
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
          // Product not found or error loading - will be handled by domain service
        }
      }
    }

    // Step 2: Delegate business logic to Domain Service
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

    // Step 3: Check if rollback needed (before saving)
    if (shouldRollback) {
      // Rollback domain changes (products haven't been saved yet)
      this.bulkStockAdjustmentService.rollbackAdjustments(
        successfulAdjustments,
      );

      const failedCount = results.filter((r) => !r.success).length;
      throw new DomainException(
        `Bulk adjustment failed: ${failedCount} adjustments failed`,
      );
    }

    // Step 4: Save all successfully adjusted products
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

      // Step 5: Return results
      const successfulCount = results.filter((r) => r.success === true).length;
      return {
        totalRequested: adjustments.length,
        successful: successfulCount,
        failed: results.length - successfulCount,
        results,
        warnings,
      };
    } catch (error) {
      // If save fails, rollback domain changes
      if (savedProducts.length > 0) {
        try {
          this.bulkStockAdjustmentService.rollbackAdjustments(savedProducts);
          // Try to save rolled back products
          for (const { product } of savedProducts) {
            await this.productRepository.save(product);
          }
        } catch (rollbackError) {
          // Log rollback error
          console.error('Failed to rollback after save error:', rollbackError);
        }
      }
      throw error;
    }
  }
}
