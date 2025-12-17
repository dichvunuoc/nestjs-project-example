/**
 * DTO for bulk stock adjustment request
 */
export class StockAdjustmentItemDto {
  productId: string;
  quantity: number; // Positive for increase, negative for decrease
  reason?: string;
}

export class BulkStockAdjustmentDto {
  adjustments: StockAdjustmentItemDto[];
  options?: {
    maxStockLimit?: number;
    minStockThreshold?: number;
    allowPartialSuccess?: boolean;
    userId?: string;
    batchReference?: string;
  };
}
