import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Product Search Criteria DTO
 *
 * Used for advanced product search with multiple filters.
 * All fields are optional to allow flexible search combinations.
 */
export class ProductSearchDto {
  @ApiPropertyOptional({
    description: 'Search by product name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by category (exact match)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Find products with stock below this threshold',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'Include soft-deleted products',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeleted?: boolean;

  @ApiPropertyOptional({ enum: ['name', 'price', 'stock', 'createdAt'] })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'price', 'stock', 'createdAt'])
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

/**
 * Category Breakdown item in statistics
 */
export interface CategoryBreakdown {
  category: string;
  count: number;
  totalValue: number;
}

/**
 * Product Statistics DTO
 *
 * Contains aggregated statistics about products.
 * Used for dashboard and reporting.
 */
export class ProductStatisticsDto {
  constructor(
    public readonly totalProducts: number,
    public readonly totalValue: number,
    public readonly avgPrice: number,
    public readonly lowStockCount: number,
    public readonly outOfStockCount: number,
    public readonly categoryBreakdown: CategoryBreakdown[],
  ) {}
}
