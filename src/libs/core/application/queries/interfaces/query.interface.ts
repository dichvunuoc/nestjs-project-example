/**
 * Query interface với Phantom Type
 *
 * Marker interface for CQRS queries với result type
 *
 * Sử dụng kỹ thuật Phantom Type để TypeScript có thể suy luận TResult:
 * - Thuộc tính _resultType không tồn tại lúc runtime (undefined)
 * - Nhưng giúp TS biết TResult là gì khi type inference
 *
 * Usage:
 * export class GetUserListQuery implements IQuery<UserDto[]> {
 *   constructor(public readonly page: number) {}
 * }
 *
 * const result = await queryBus.execute(new GetUserListQuery(1));
 * // result tự động được hiểu là UserDto[] - không cần type assertion!
 */
export class IQuery<TResult> {
  /**
   * Phantom Type property
   * Không tồn tại lúc runtime, chỉ để TypeScript suy luận TResult
   */
  public readonly _resultType?: TResult;
}
