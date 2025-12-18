/**
 * Read DAO Interface
 *
 * Interface cho Read Side data access
 * Read Side queries được tối ưu hóa cho performance với denormalized data
 */
export interface IReadDao {
  /**
   * Execute query và return results
   */
  executeQuery<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * Execute query và return single result
   */
  executeQueryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;

  /**
   * Execute count query
   */
  executeCount(sql: string, params?: any[]): Promise<number>;
}
