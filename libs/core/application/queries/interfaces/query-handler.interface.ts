import { IQuery } from './query.interface';

/**
 * Query Handler interface (Pure TypeScript - No Framework Dependency)
 *
 * Handlers execute queries và return results
 * Tự viết lại để tránh coupling với NestJS framework
 *
 * @template TQuery - Type của Query mà handler này xử lý
 * @template TResult - Type của kết quả trả về
 */
export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult = any> {
  /**
   * Execute query và return result
   * @param query Query object to execute
   * @returns Promise với TResult
   */
  execute(query: TQuery): Promise<TResult>;
}
