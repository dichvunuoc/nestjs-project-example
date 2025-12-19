/**
 * Base Read DAO (Data Access Object) - Pure TypeScript
 *
 * Abstract class providing base functionality cho Read Side queries.
 * Optimized cho query performance với Raw SQL hoặc lightweight query builders.
 *
 * NOTE: This is an abstract class - NO @Injectable() decorator!
 * Concrete subclasses in module's infrastructure layer should add @Injectable().
 *
 * Read Side không cần business logic phức tạp, chỉ cần:
 * - Fast data retrieval
 * - Denormalized data access
 * - No JOINs nếu có thể (data đã được denormalized trong Read DB)
 *
 * Subclasses should use:
 * - Raw SQL với database driver (pg, mysql2)
 * - Drizzle ORM query builder
 * - Knex query builder
 * - Any lightweight query mechanism
 *
 * @example
 * ```typescript
 * // In module's infrastructure layer
 * @Injectable()
 * class ProductReadDao extends BaseReadDao implements IProductReadDao {
 *   constructor(@Inject(DATABASE_READ_TOKEN) private readonly db: DrizzleDB) {
 *     super();
 *   }
 *
 *   protected async executeQuery<T>(sql: string, params?: unknown[]): Promise<T[]> {
 *     const result = await this.db.execute(sql);
 *     return result.rows as T[];
 *   }
 * }
 * ```
 */
export abstract class BaseReadDao {
  /**
   * Execute raw SQL query
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Query results
   */
  protected abstract executeQuery<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;

  /**
   * Execute raw SQL query và return single result
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Single result hoặc null
   */
  protected async executeQueryOne<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T | null> {
    const results = await this.executeQuery<T>(sql, params);
    return results[0] ?? null;
  }

  /**
   * Execute count query
   * @param sql SQL count query
   * @param params Query parameters
   * @returns Count result
   */
  protected async executeCount(
    sql: string,
    params?: unknown[],
  ): Promise<number> {
    const result = await this.executeQueryOne<{ count: string | number }>(
      sql,
      params,
    );
    return result ? Number(result.count) : 0;
  }

  /**
   * Build pagination clause for SQL queries
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns SQL LIMIT OFFSET clause
   */
  protected buildPaginationClause(page: number, limit: number): string {
    const offset = (page - 1) * limit;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Calculate pagination metadata
   * @param totalCount Total number of items
   * @param page Current page (1-based)
   * @param limit Items per page
   * @returns Pagination metadata
   */
  protected calculatePagination(
    totalCount: number,
    page: number,
    limit: number,
  ): {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const totalPages = Math.ceil(totalCount / limit);
    return {
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
