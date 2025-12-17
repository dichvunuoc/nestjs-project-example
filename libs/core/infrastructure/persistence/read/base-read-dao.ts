import { Injectable } from '@nestjs/common';

/**
 * Base Read DAO (Data Access Object)
 *
 * Provides base functionality cho Read Side queries
 * Optimized cho query performance với Raw SQL hoặc lightweight query builders
 *
 * Read Side không cần business logic phức tạp, chỉ cần:
 * - Fast data retrieval
 * - Denormalized data access
 * - No JOINs nếu có thể (data đã được denormalized trong Read DB)
 *
 * Subclasses should use:
 * - Raw SQL với database driver (pg, mysql2)
 * - Knex query builder
 * - TypeORM QueryBuilder (lightweight, không dùng Entity)
 * - Dapper-style data access
 */
@Injectable()
export abstract class BaseReadDao {
  /**
   * Execute raw SQL query
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Query results
   */
  protected abstract executeQuery<T = any>(
    sql: string,
    params?: any[],
  ): Promise<T[]>;

  /**
   * Execute raw SQL query và return single result
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Single result hoặc null
   */
  protected async executeQueryOne<T = any>(
    sql: string,
    params?: any[],
  ): Promise<T | null> {
    const results = await this.executeQuery<T>(sql, params);
    return results[0] || null;
  }

  /**
   * Execute count query
   * @param sql SQL count query
   * @param params Query parameters
   * @returns Count result
   */
  protected async executeCount(sql: string, params?: any[]): Promise<number> {
    const result = await this.executeQueryOne<{ count: string | number }>(
      sql,
      params,
    );
    return result ? Number(result.count) : 0;
  }
}
