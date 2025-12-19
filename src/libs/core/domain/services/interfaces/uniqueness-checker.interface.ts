/**
 * Uniqueness Checker Interface (Domain Service Port)
 *
 * Interface định nghĩa tại Domain Layer để kiểm tra tính duy nhất của các thuộc tính.
 * Infrastructure Layer sẽ implement interface này (Adapter).
 *
 * Lý do đặt ở Domain Layer:
 * - Business rule "unique name" thuộc về Domain
 * - Domain Service cần interface này để validate
 * - Tuân thủ Dependency Inversion Principle
 *
 * @example
 * ```typescript
 * // Infrastructure implementation
 * class ProductUniquenessChecker implements IUniquenessChecker {
 *   constructor(private readonly db: DrizzleDB) {}
 *
 *   async isUnique(field: string, value: string, excludeId?: string): Promise<boolean> {
 *     // Query database to check uniqueness
 *   }
 * }
 * ```
 */
export interface IUniquenessChecker {
  /**
   * Kiểm tra giá trị có duy nhất không
   *
   * @param field - Tên field cần kiểm tra (e.g., 'name', 'email')
   * @param value - Giá trị cần kiểm tra
   * @param excludeId - Optional ID để exclude (dùng khi update)
   * @returns true nếu giá trị là duy nhất
   */
  isUnique(field: string, value: string, excludeId?: string): Promise<boolean>;
}

/**
 * Generic Uniqueness Checker Interface với type-safe field names
 *
 * @template TFields - Union type của các field names được phép
 *
 * @example
 * ```typescript
 * type ProductUniqueFields = 'name' | 'sku';
 *
 * interface IProductUniquenessChecker extends ITypedUniquenessChecker<ProductUniqueFields> {}
 * ```
 */
export interface ITypedUniquenessChecker<TFields extends string> {
  /**
   * Kiểm tra giá trị có duy nhất không (type-safe)
   *
   * @param field - Field name (type-safe)
   * @param value - Giá trị cần kiểm tra
   * @param excludeId - Optional ID để exclude (dùng khi update)
   * @returns true nếu giá trị là duy nhất
   */
  isUnique(field: TFields, value: string, excludeId?: string): Promise<boolean>;
}
