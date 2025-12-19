import { ProductDto, ProductSearchDto, ProductStatisticsDto } from '../../dtos';

/**
 * Product Read DAO Interface (Port)
 *
 * Interface cho Read Side queries - định nghĩa ở Application Layer
 * Infrastructure Layer sẽ implement interface này (Adapter)
 *
 * Tuân theo Dependency Inversion Principle:
 * - Application layer định nghĩa interface (Port)
 * - Infrastructure layer implement (Adapter)
 * - Application layer không phụ thuộc vào Infrastructure
 *
 * ## CQRS Note
 * This interface is for READ operations only.
 * Write operations go through IProductRepository (Write Side).
 */
export interface IProductReadDao {
  /**
   * Find product by ID
   *
   * @param id Product ID
   * @returns ProductDto or null if not found
   */
  findById(id: string): Promise<ProductDto | null>;

  /**
   * Find many products with pagination and filters
   *
   * @param options Pagination and filter options
   * @returns Array of ProductDto
   */
  findMany(options: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
  }): Promise<ProductDto[]>;

  /**
   * Advanced search with multiple criteria
   *
   * Supports:
   * - Name partial match (LIKE)
   * - Category exact match
   * - Price range filtering
   * - Low stock threshold
   * - Sorting and pagination
   *
   * @param criteria Search criteria
   * @returns Array of ProductDto matching criteria
   */
  search(criteria: ProductSearchDto): Promise<ProductDto[]>;

  /**
   * Count products matching search criteria
   *
   * @param criteria Search criteria (without pagination)
   * @returns Total count of matching products
   */
  countBySearch(
    criteria: Omit<ProductSearchDto, 'page' | 'limit'>,
  ): Promise<number>;

  /**
   * Get product statistics
   *
   * Aggregates:
   * - Total products
   * - Total inventory value
   * - Average price
   * - Low stock count
   * - Out of stock count
   * - Category breakdown
   *
   * @param lowStockThreshold Threshold for low stock count (default: 10)
   * @returns ProductStatisticsDto
   */
  getStatistics(lowStockThreshold?: number): Promise<ProductStatisticsDto>;

  /**
   * Find products with low stock
   *
   * @param threshold Stock threshold
   * @returns Array of ProductDto with stock below threshold
   */
  findLowStock(threshold: number): Promise<ProductDto[]>;

  /**
   * Invalidate cache for a specific product
   *
   * @param id Product ID
   */
  invalidateCache(id: string): Promise<void>;

  /**
   * Invalidate cache for multiple products
   *
   * @param ids Product IDs
   */
  invalidateCacheMany(ids: string[]): Promise<void>;
}
