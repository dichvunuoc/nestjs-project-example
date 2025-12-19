import { ICommand } from 'src/libs/core/application';

/**
 * Stock Adjustment Item
 * Represents a single product stock adjustment in a bulk operation
 */
export interface StockAdjustmentItem {
  productId: string;
  quantity: number; // Positive for increase, negative for decrease
  reason?: string; // Optional reason for the adjustment
}

/**
 * Bulk Stock Adjustment Command
 *
 * Complex business logic example:
 * - Adjusts stock for multiple products in a single transaction
 * - Validates business rules (max stock limit, min stock threshold, etc.)
 * - Handles partial failures with detailed error reporting
 * - Supports different adjustment types (increase/decrease)
 * - Tracks adjustment reasons for audit purposes
 */
export class BulkStockAdjustmentCommand implements ICommand {
  constructor(
    public readonly adjustments: StockAdjustmentItem[],
    public readonly options?: {
      /**
       * Maximum total stock allowed per product after adjustment
       * If set, validates that no product exceeds this limit
       */
      maxStockLimit?: number;

      /**
       * Minimum stock threshold warning
       * If a product falls below this after adjustment, logs a warning
       */
      minStockThreshold?: number;

      /**
       * Whether to allow partial success (some products succeed, some fail)
       * If false, all adjustments must succeed or all fail (transaction-like)
       */
      allowPartialSuccess?: boolean;

      /**
       * User ID for audit trail
       */
      userId?: string;

      /**
       * Batch reference for tracking
       */
      batchReference?: string;
    },
  ) {
    // Validate command structure
    if (!adjustments || adjustments.length === 0) {
      throw new Error('At least one stock adjustment is required');
    }

    if (adjustments.length > 100) {
      throw new Error('Cannot process more than 100 adjustments at once');
    }

    // Validate each adjustment item
    adjustments.forEach((adj, index) => {
      if (!adj.productId || adj.productId.trim().length === 0) {
        throw new Error(`Adjustment at index ${index}: productId is required`);
      }
      if (adj.quantity === 0) {
        throw new Error(
          `Adjustment at index ${index}: quantity cannot be zero`,
        );
      }
    });
  }
}
