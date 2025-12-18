import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single stock adjustment item
 */
export class StockAdjustmentItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @IsNumber({}, { message: 'Quantity must be a number' })
  quantity: number; // Positive for increase, negative for decrease

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Options for bulk stock adjustment
 */
export class BulkStockAdjustmentOptionsDto {
  @IsOptional()
  @IsNumber({}, { message: 'Max stock limit must be a number' })
  @Min(0, { message: 'Max stock limit cannot be negative' })
  maxStockLimit?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Min stock threshold must be a number' })
  @Min(0, { message: 'Min stock threshold cannot be negative' })
  minStockThreshold?: number;

  @IsOptional()
  @IsBoolean({ message: 'Allow partial success must be a boolean' })
  allowPartialSuccess?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  batchReference?: string;
}

/**
 * DTO for bulk stock adjustment request
 *
 * Allows adjusting stock for multiple products in a single request.
 * Supports partial success mode and various validation options.
 */
export class BulkStockAdjustmentDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one adjustment is required' })
  @ValidateNested({ each: true })
  @Type(() => StockAdjustmentItemDto)
  adjustments: StockAdjustmentItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BulkStockAdjustmentOptionsDto)
  options?: BulkStockAdjustmentOptionsDto;
}
