import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  eq,
  and,
  or,
  like,
  gt,
  lt,
  between,
  desc,
  asc,
  sql,
  SQL,
  count,
} from 'drizzle-orm';

// Import từ Core (interfaces)
import type { ICacheService } from 'src/libs/core/infrastructure';
import { CACHE_SERVICE_TOKEN } from 'src/libs/core/constants';

// Import từ Shared (implementations)
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';

// Import Application DTOs & Ports
import {
  ProductDto,
  ProductSearchDto,
  ProductStatisticsDto,
  CategoryBreakdown,
} from '../../../application/dtos';
import { IProductReadDao } from '../../../application/queries/ports';

// Import Infrastructure
import { ProductRecord, productsTable } from '../drizzle/schema';

/**
 * Product Read DAO Implementation
 *
 * Optimized for read operations with optional caching layer.
 * Uses Drizzle ORM for efficient queries.
 *
 * ## CQRS Note
 * This is the READ SIDE implementation. All query operations should go here.
 * Write operations go through ProductRepository (Write Side).
 *
 * ## Caching Strategy
 *
 * - Single product (findById): Cached with key `product:{id}`
 * - Product lists: NOT cached (too many variations, use Redis for production)
 *
 * ## Cache Invalidation
 *
 * Cache is invalidated by:
 * - ProductReadModelProjection when handling ProductUpdatedEvent/ProductDeletedEvent
 * - Explicit call to invalidateCache(id)
 *
 * ## TTL Configuration
 *
 * Default TTL: 300 seconds (5 minutes)
 * Configure via constructor or environment variable
 */
@Injectable()
export class ProductReadDao extends BaseReadDao implements IProductReadDao {
  private readonly logger = new Logger(ProductReadDao.name);
  private readonly CACHE_PREFIX = 'product';
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly DEFAULT_LOW_STOCK_THRESHOLD = 10;

  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB<typeof schema>,
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
  ) {
    super();

    if (this.cacheService) {
      this.logger.log('ProductReadDao initialized with caching enabled');
    }
  }

  protected async executeQuery<T = unknown>(sql: string): Promise<T[]> {
    type ExecuteParam = Parameters<typeof this.db.execute>[0];
    const result = await this.db.execute(sql as ExecuteParam);
    return result.rows as T[];
  }

  /**
   * Find product by ID with caching
   *
   * Cache Strategy:
   * 1. Check cache first
   * 2. If cache miss, query database
   * 3. Store result in cache
   * 4. Return result
   */
  async findById(id: string): Promise<ProductDto | null> {
    const cacheKey = this.getCacheKey(id);

    // Try cache first
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<ProductDto>(cacheKey);
        if (cached) {
          this.logger.debug(`Cache HIT for product: ${id}`);
          // Reconstruct ProductDto from cached plain object
          return new ProductDto(
            cached.id,
            cached.name,
            cached.description,
            cached.price.amount,
            cached.price.currency,
            cached.stock,
            cached.category,
            new Date(cached.createdAt),
            new Date(cached.updatedAt),
          );
        }
        this.logger.debug(`Cache MISS for product: ${id}`);
      } catch (error) {
        this.logger.warn(`Cache error for product ${id}: ${String(error)}`);
        // Continue with database query on cache error
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, id), eq(productsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const product = this.mapToDto(result[0]);

    // Store in cache
    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, product, this.CACHE_TTL);
        this.logger.debug(`Cached product: ${id}`);
      } catch (error) {
        this.logger.warn(`Failed to cache product ${id}: ${error}`);
      }
    }

    return product;
  }

  /**
   * Find multiple products (not cached due to complexity)
   *
   * For production, consider:
   * - Redis sorted sets for pagination
   * - Elasticsearch for full-text search
   * - Materialized views for complex filters
   */
  async findMany(options: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
  }): Promise<ProductDto[]> {
    const offset = (options.page - 1) * options.limit;
    const conditions: SQL[] = [eq(productsTable.isDeleted, false)];

    if (options.category) {
      conditions.push(eq(productsTable.category, options.category));
    }

    if (options.search) {
      conditions.push(
        or(
          like(productsTable.name, `%${options.search}%`),
          like(productsTable.description, `%${options.search}%`),
        )!,
      );
    }

    const results = (await this.db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .limit(options.limit)
      .offset(offset)
      .orderBy(desc(productsTable.createdAt))) as ProductRecord[];

    return results.map((row) => this.mapToDto(row));
  }

  /**
   * Advanced Search with QueryBuilder Pattern
   *
   * Demonstrates building complex queries dynamically:
   * - Multiple optional filters
   * - Dynamic WHERE conditions
   * - Sorting and pagination
   * - LIKE patterns for partial match
   *
   * @example
   * ```typescript
   * // Find electronics with price between $100-$500, low stock
   * const results = await dao.search({
   *   category: 'electronics',
   *   minPrice: 100,
   *   maxPrice: 500,
   *   lowStockThreshold: 10,
   *   sortBy: 'price',
   *   sortOrder: 'asc',
   *   limit: 20,
   * });
   * ```
   */
  async search(criteria: ProductSearchDto): Promise<ProductDto[]> {
    this.logger.debug('Executing advanced search', { criteria });

    const conditions = this.buildSearchConditions(criteria);

    // Build query with QueryBuilder
    let query = this.db
      .select()
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Apply sorting
    const sortColumn = this.getSortColumn(criteria.sortBy);
    if (sortColumn) {
      query = query.orderBy(
        criteria.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn),
      ) as typeof query;
    }

    // Apply pagination
    const limit = criteria.limit ?? 20;
    const page = criteria.page ?? 1;
    const offset = (page - 1) * limit;

    query = query.limit(limit).offset(offset) as typeof query;

    const results = await query;

    this.logger.debug(`Search returned ${results.length} results`);

    return results.map((row) => this.mapToDto(row as ProductRecord));
  }

  /**
   * Count products matching search criteria
   */
  async countBySearch(
    criteria: Omit<ProductSearchDto, 'page' | 'limit'>,
  ): Promise<number> {
    const conditions = this.buildSearchConditions(criteria);

    const result = await this.db
      .select({ count: count() })
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result[0]?.count ?? 0;
  }

  /**
   * Get Product Statistics using Raw SQL Aggregations
   *
   * Demonstrates complex SQL queries:
   * - COUNT, SUM, AVG aggregations
   * - GROUP BY clauses
   * - Conditional aggregations (CASE WHEN)
   * - Multiple aggregations in single query
   *
   * @example
   * ```typescript
   * const stats = await dao.getStatistics(10);
   * console.log(stats);
   * // {
   * //   totalProducts: 150,
   * //   totalValue: 125000.50,
   * //   avgPrice: 833.33,
   * //   lowStockCount: 12,
   * //   outOfStockCount: 3,
   * //   categoryBreakdown: [...]
   * // }
   * ```
   */
  async getStatistics(
    lowStockThreshold: number = this.DEFAULT_LOW_STOCK_THRESHOLD,
  ): Promise<ProductStatisticsDto> {
    this.logger.debug('Calculating product statistics', { lowStockThreshold });

    // Query 1: Get overall statistics using Raw SQL aggregations
    const statsQuery = this.db
      .select({
        totalProducts: sql<number>`COUNT(*)`.as('total_products'),
        totalValue:
          sql<number>`COALESCE(SUM(CAST(${productsTable.priceAmount} AS DECIMAL) * ${productsTable.stock}), 0)`.as(
            'total_value',
          ),
        avgPrice:
          sql<number>`COALESCE(AVG(CAST(${productsTable.priceAmount} AS DECIMAL)), 0)`.as(
            'avg_price',
          ),
        lowStockCount:
          sql<number>`COUNT(CASE WHEN ${productsTable.stock} > 0 AND ${productsTable.stock} < ${lowStockThreshold} THEN 1 END)`.as(
            'low_stock_count',
          ),
        outOfStockCount:
          sql<number>`COUNT(CASE WHEN ${productsTable.stock} = 0 THEN 1 END)`.as(
            'out_of_stock_count',
          ),
      })
      .from(productsTable)
      .where(eq(productsTable.isDeleted, false));

    const [overallStats] = await statsQuery;

    // Query 2: Get category breakdown using GROUP BY
    const categoryQuery = this.db
      .select({
        category: productsTable.category,
        count: sql<number>`COUNT(*)`.as('count'),
        totalValue:
          sql<number>`COALESCE(SUM(CAST(${productsTable.priceAmount} AS DECIMAL) * ${productsTable.stock}), 0)`.as(
            'total_value',
          ),
      })
      .from(productsTable)
      .where(eq(productsTable.isDeleted, false))
      .groupBy(productsTable.category)
      .orderBy(desc(sql`COUNT(*)`));

    const categoryBreakdown = await categoryQuery;

    return new ProductStatisticsDto(
      Number(overallStats.totalProducts) || 0,
      Number(overallStats.totalValue) || 0,
      Number(overallStats.avgPrice) || 0,
      Number(overallStats.lowStockCount) || 0,
      Number(overallStats.outOfStockCount) || 0,
      categoryBreakdown.map(
        (row): CategoryBreakdown => ({
          category: row.category,
          count: Number(row.count) || 0,
          totalValue: Number(row.totalValue) || 0,
        }),
      ),
    );
  }

  /**
   * Find Products with Low Stock
   *
   * Simple example of condition-based filtering.
   * Can be used for inventory alerts.
   */
  async findLowStock(threshold: number): Promise<ProductDto[]> {
    this.logger.debug('Finding low stock products', { threshold });

    const results = await this.db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.isDeleted, false),
          lt(productsTable.stock, threshold),
          gt(productsTable.stock, 0), // Exclude out of stock
        ),
      )
      .orderBy(asc(productsTable.stock));

    return results.map((row) => this.mapToDto(row as ProductRecord));
  }

  /**
   * Invalidate cache for a specific product
   *
   * Called by:
   * - ProductReadModelProjection on ProductUpdatedEvent
   * - ProductReadModelProjection on ProductDeletedEvent
   */
  async invalidateCache(id: string): Promise<void> {
    if (!this.cacheService) return;

    const cacheKey = this.getCacheKey(id);
    try {
      await this.cacheService.delete(cacheKey);
      this.logger.debug(`Cache invalidated for product: ${id}`);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate cache for product ${id}: ${String(error)}`,
      );
    }
  }

  /**
   * Invalidate cache for multiple products
   */
  async invalidateCacheMany(ids: string[]): Promise<void> {
    if (!this.cacheService || ids.length === 0) return;

    const cacheKeys = ids.map((id) => this.getCacheKey(id));
    try {
      await this.cacheService.mdelete(cacheKeys);
      this.logger.debug(`Cache invalidated for ${ids.length} products`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache for products: ${error}`);
    }
  }

  // --- Private Helper Methods ---

  /**
   * Build search conditions from criteria
   */
  private buildSearchConditions(
    criteria: Omit<ProductSearchDto, 'page' | 'limit'>,
  ): SQL[] {
    const conditions: SQL[] = [];

    // Filter: isDeleted (default: exclude deleted)
    if (!criteria.includeDeleted) {
      conditions.push(eq(productsTable.isDeleted, false));
    }

    // Filter: name (partial match with LIKE)
    if (criteria.name) {
      conditions.push(like(productsTable.name, `%${criteria.name}%`));
    }

    // Filter: category (exact match)
    if (criteria.category) {
      conditions.push(eq(productsTable.category, criteria.category));
    }

    // Filter: price range using between or individual gt/lt
    if (criteria.minPrice !== undefined && criteria.maxPrice !== undefined) {
      conditions.push(
        between(
          sql`CAST(${productsTable.priceAmount} AS DECIMAL)`,
          criteria.minPrice,
          criteria.maxPrice,
        ),
      );
    } else if (criteria.minPrice !== undefined) {
      conditions.push(
        gt(
          sql`CAST(${productsTable.priceAmount} AS DECIMAL)`,
          criteria.minPrice,
        ),
      );
    } else if (criteria.maxPrice !== undefined) {
      conditions.push(
        lt(
          sql`CAST(${productsTable.priceAmount} AS DECIMAL)`,
          criteria.maxPrice,
        ),
      );
    }

    // Filter: low stock (stock below threshold)
    if (criteria.lowStockThreshold !== undefined) {
      conditions.push(lt(productsTable.stock, criteria.lowStockThreshold));
    }

    return conditions;
  }

  /**
   * Helper: Get sort column for dynamic sorting
   */
  private getSortColumn(sortBy?: string) {
    switch (sortBy) {
      case 'name':
        return productsTable.name;
      case 'price':
        return sql`CAST(${productsTable.priceAmount} AS DECIMAL)`;
      case 'stock':
        return productsTable.stock;
      case 'createdAt':
        return productsTable.createdAt;
      default:
        return productsTable.createdAt;
    }
  }

  /**
   * Get cache key for a product
   */
  private getCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}:${id}`;
  }

  /**
   * Map database record to ProductDto
   */
  private mapToDto(row: ProductRecord): ProductDto {
    return new ProductDto(
      row.id,
      row.name,
      row.description || '',
      parseFloat(row.priceAmount),
      row.priceCurrency,
      row.stock,
      row.category,
      row.createdAt,
      row.updatedAt,
    );
  }
}
