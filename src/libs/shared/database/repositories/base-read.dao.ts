/**
 * Base Read DAO (Data Access Object) - Pure TypeScript
 *
 * Abstract class providing base functionality for Read Side queries.
 * Optimized for query performance with Raw SQL or lightweight query builders.
 *
 * NOTE: This is an abstract class - NO @Injectable() decorator!
 * Concrete subclasses in module's infrastructure layer should add @Injectable().
 *
 * Read Side doesn't need complex business logic, just:
 * - Fast data retrieval
 * - Denormalized data access
 * - No JOINs if possible (data already denormalized in Read DB)
 */
export abstract class BaseReadDao {
  /**
   * Execute raw SQL query
   */
  protected abstract executeQuery<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;

  /**
   * Execute raw SQL query and return single result
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
   */
  protected buildPaginationClause(page: number, limit: number): string {
    const offset = (page - 1) * limit;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Calculate pagination metadata
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
