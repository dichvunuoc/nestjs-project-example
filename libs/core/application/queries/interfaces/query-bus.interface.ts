import { IQuery } from './query.interface';

/**
 * Query Bus interface
 * Mediator pattern cho CQRS query execution
 *
 * Type-safe query execution với automatic type inference:
 * - Đưa cho tôi một Query có mong muốn trả về TResult
 * - Tôi sẽ trả lại Promise<TResult>
 *
 * Usage:
 * const result = await queryBus.execute(new GetUserListQuery(1));
 * // result tự động được hiểu là UserDto[] - không cần type assertion!
 */
export interface IQueryBus {
  /**
   * Execute query và tự động suy diễn kiểu trả về (TResult)
   * dựa trên IQuery<TResult> được truyền vào.
   *
   * @param query Query object với Phantom Type TResult
   * @returns Promise với TResult được suy luận tự động
   */
  execute<TResult>(query: IQuery<TResult>): Promise<TResult>;
}
