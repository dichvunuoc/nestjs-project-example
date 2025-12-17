import { DomainException } from '@core/common';
import { Product } from '../entities';
import type { StockAdjustmentItem } from '../../application/commands/bulk-stock-adjustment.command';

/**
 * Stock Adjustment Result
 * Represents the result of adjusting a single product's stock
 */
export interface StockAdjustmentResult {
  productId: string;
  success: boolean;
  previousStock: number;
  newStock: number;
  quantity: number;
  error?: string;
  warning?: string;
}

/**
 * Bulk Stock Adjustment Options
 */
export interface BulkStockAdjustmentOptions {
  /**
   * Maximum total stock allowed per product after adjustment
   */
  maxStockLimit?: number;

  /**
   * Minimum stock threshold warning
   */
  minStockThreshold?: number;

  /**
   * Whether to allow partial success
   */
  allowPartialSuccess?: boolean;
}

/**
 * Bulk Stock Adjustment Service
 *
 * Domain Service chứa business logic phức tạp cho bulk stock adjustment.
 * Theo DDD, Domain Services được dùng khi:
 * - Logic không thuộc về một aggregate cụ thể
 * - Cần phối hợp nhiều aggregates
 * - Logic nghiệp vụ phức tạp cần tách riêng
 *
 * Service này:
 * - Pure TypeScript, không phụ thuộc framework
 * - Chứa validation rules và business rules
 * - Có thể test độc lập
 * - Có thể tái sử dụng ở nhiều nơi
 */
export class BulkStockAdjustmentService {
  /**
   * Validate products exist and no duplicates
   */
  constructor() {}
  validateProducts(
    adjustments: StockAdjustmentItem[],
    productMap: Map<string, Product>,
  ): {
    validProducts: Map<string, Product>;
    errors: string[];
    failedResults: StockAdjustmentResult[];
  } {
    const validProducts = new Map<string, Product>();
    const errors: string[] = [];
    const failedResults: StockAdjustmentResult[] = [];

    for (const adjustment of adjustments) {
      // Check for duplicate product IDs in the same batch
      if (validProducts.has(adjustment.productId)) {
        errors.push(`Duplicate product ID in batch: ${adjustment.productId}`);
        continue;
      }

      const product = productMap.get(adjustment.productId);
      if (!product) {
        errors.push(`Product not found: ${adjustment.productId}`);
        failedResults.push({
          productId: adjustment.productId,
          success: false,
          previousStock: 0,
          newStock: 0,
          quantity: adjustment.quantity,
          error: `Product not found`,
        });
      } else {
        validProducts.set(adjustment.productId, product);
      }
    }

    return { validProducts, errors, failedResults };
  }

  /**
   * Validate business rules (max stock limit)
   */
  validateBusinessRules(
    adjustments: StockAdjustmentItem[],
    validProducts: Map<string, Product>,
    options: BulkStockAdjustmentOptions,
  ): {
    validatedProducts: Map<string, Product>;
    errors: string[];
    failedResults: StockAdjustmentResult[];
  } {
    const validatedProducts = new Map<string, Product>();
    const errors: string[] = [];
    const failedResults: StockAdjustmentResult[] = [];

    if (options.maxStockLimit === undefined) {
      // No max limit, all valid products pass
      return {
        validatedProducts: validProducts,
        errors: [],
        failedResults: [],
      };
    }

    for (const adjustment of adjustments) {
      const product = validProducts.get(adjustment.productId);
      if (!product) continue;

      const projectedStock = product.stock + adjustment.quantity;
      if (projectedStock > options.maxStockLimit) {
        const error = `Product ${adjustment.productId} would exceed max stock limit (${options.maxStockLimit}). Current: ${product.stock}, Adjustment: ${adjustment.quantity}, Projected: ${projectedStock}`;

        errors.push(error);
        failedResults.push({
          productId: adjustment.productId,
          success: false,
          previousStock: product.stock,
          newStock: product.stock,
          quantity: adjustment.quantity,
          error,
        });
      } else {
        validatedProducts.set(adjustment.productId, product);
      }
    }

    return { validatedProducts, errors, failedResults };
  }

  /**
   * Execute stock adjustments on products
   * Returns results and tracks successful adjustments for potential rollback
   */
  executeAdjustments(
    adjustments: StockAdjustmentItem[],
    validatedProducts: Map<string, Product>,
    options: BulkStockAdjustmentOptions,
  ): {
    results: StockAdjustmentResult[];
    warnings: string[];
    successfulAdjustments: Array<{
      product: Product;
      adjustment: StockAdjustmentItem;
      previousStock: number;
    }>;
  } {
    const results: StockAdjustmentResult[] = [];
    const warnings: string[] = [];
    const successfulAdjustments: Array<{
      product: Product;
      adjustment: StockAdjustmentItem;
      previousStock: number;
    }> = [];

    for (const adjustment of adjustments) {
      const product = validatedProducts.get(adjustment.productId);
      if (!product) continue; // Skip if already failed validation

      try {
        const previousStock = product.stock;

        // Validate adjustment won't cause negative stock
        if (
          adjustment.quantity < 0 &&
          product.stock + adjustment.quantity < 0
        ) {
          const error = `Insufficient stock for product ${adjustment.productId}. Current: ${product.stock}, Requested decrease: ${Math.abs(adjustment.quantity)}`;

          results.push({
            productId: adjustment.productId,
            success: false,
            previousStock,
            newStock: previousStock,
            quantity: adjustment.quantity,
            error,
          });
          continue;
        }

        // Perform adjustment using domain methods
        if (adjustment.quantity > 0) {
          product.increaseStock(adjustment.quantity);
        } else {
          product.decreaseStock(Math.abs(adjustment.quantity));
        }

        const newStock = product.stock;

        // Check min stock threshold warning
        if (
          options.minStockThreshold !== undefined &&
          newStock < options.minStockThreshold
        ) {
          warnings.push(
            `Product ${adjustment.productId} stock (${newStock}) is below threshold (${options.minStockThreshold})`,
          );
        }

        // Track for potential rollback
        successfulAdjustments.push({
          product,
          adjustment,
          previousStock,
        });

        results.push({
          productId: adjustment.productId,
          success: true,
          previousStock,
          newStock,
          quantity: adjustment.quantity,
          warning:
            options.minStockThreshold !== undefined &&
            newStock < options.minStockThreshold
              ? `Stock below threshold`
              : undefined,
        });
      } catch (error) {
        // Handle domain exceptions
        results.push({
          productId: adjustment.productId,
          success: false,
          previousStock: product.stock,
          newStock: product.stock,
          quantity: adjustment.quantity,
          error: error.message || 'Unknown error during adjustment',
        });
      }
    }

    return { results, warnings, successfulAdjustments };
  }

  /**
   * Rollback successful adjustments
   * This provides transaction-like behavior
   */
  rollbackAdjustments(
    successfulAdjustments: Array<{
      product: Product;
      adjustment: StockAdjustmentItem;
      previousStock: number;
    }>,
  ): void {
    for (const { product, adjustment } of successfulAdjustments) {
      try {
        // Revert the adjustment using domain methods
        if (adjustment.quantity > 0) {
          product.decreaseStock(adjustment.quantity);
        } else {
          product.increaseStock(Math.abs(adjustment.quantity));
        }
      } catch (rollbackError) {
        // Log rollback error but don't throw - we're already in error state
        // In production, this should use proper logging
        throw new DomainException(
          `Failed to rollback adjustment for product ${adjustment.productId}: ${rollbackError.message}`,
        );
      }
    }
  }

  /**
   * Main orchestration method
   * Coordinates all validation and execution steps
   */
  processBulkAdjustment(
    adjustments: StockAdjustmentItem[],
    productMap: Map<string, Product>,
    options: BulkStockAdjustmentOptions,
  ): {
    results: StockAdjustmentResult[];
    warnings: string[];
    successfulAdjustments: Array<{
      product: Product;
      adjustment: StockAdjustmentItem;
      previousStock: number;
    }>;
    shouldRollback: boolean;
  } {
    // Step 1: Validate products exist
    const {
      validProducts,
      errors: validationErrors,
      failedResults,
    } = this.validateProducts(adjustments, productMap);

    // If no valid products and partial success not allowed, fail early
    if (
      !options.allowPartialSuccess &&
      validationErrors.length > 0 &&
      validProducts.size === 0
    ) {
      throw new DomainException(
        `Bulk adjustment failed: ${validationErrors.join('; ')}`,
      );
    }

    // Step 2: Validate business rules
    const {
      validatedProducts,
      errors: businessRuleErrors,
      failedResults: businessRuleFailedResults,
    } = this.validateBusinessRules(adjustments, validProducts, options);

    // Combine failed results
    const allFailedResults = [...failedResults, ...businessRuleFailedResults];

    // If business rule violation and partial success not allowed, fail early
    if (
      !options.allowPartialSuccess &&
      businessRuleErrors.length > 0 &&
      validatedProducts.size === 0
    ) {
      throw new DomainException(
        `Bulk adjustment failed: ${businessRuleErrors.join('; ')}`,
      );
    }

    // Step 3: Execute adjustments
    const { results, warnings, successfulAdjustments } =
      this.executeAdjustments(adjustments, validatedProducts, options);

    // Combine all results
    const allResults = [...allFailedResults, ...results];

    // Check if we need to rollback (all failed when partial success not allowed)
    const successfulCount = allResults.filter((r) => r.success).length;
    const shouldRollback =
      !options.allowPartialSuccess &&
      successfulCount < adjustments.length &&
      successfulAdjustments.length > 0;

    return {
      results: allResults,
      warnings,
      successfulAdjustments,
      shouldRollback,
    };
  }
}
