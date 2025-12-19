import { ITypedUniquenessChecker } from 'src/libs/core/domain';
import { ConflictException } from 'src/libs/core/common';

/**
 * Product Unique Fields
 *
 * Các fields của Product cần đảm bảo tính duy nhất
 */
export type ProductUniqueFields = 'name' | 'sku';

/**
 * Product Uniqueness Checker Interface (Port)
 *
 * Interface cho việc kiểm tra tính duy nhất của Product.
 * Được định nghĩa ở Domain Layer.
 * Infrastructure Layer sẽ implement.
 */
export interface IProductUniquenessChecker extends ITypedUniquenessChecker<ProductUniqueFields> {}

/**
 * Product Uniqueness Service
 *
 * Domain Service đảm bảo business rule: Product name must be unique.
 *
 * Tại sao đây là Domain Service?
 * - Business rule "unique name" thuộc về Domain
 * - Logic này không thuộc về một Aggregate cụ thể
 * - Cần truy vấn database để validate → sử dụng Port interface
 *
 * Exception Strategy:
 * - Uses ConflictException (HTTP 409) for duplicate resources
 * - This is more semantically correct than DomainException
 * - ConflictException.duplicate() factory method provides structured error
 *
 * @example
 * ```typescript
 * // Trong Command Handler
 * const uniquenessService = new ProductUniquenessService(uniquenessChecker);
 * await uniquenessService.ensureNameIsUnique(command.name);
 *
 * // Nếu name không unique, sẽ throw ConflictException
 * ```
 */
export class ProductUniquenessService {
  constructor(private readonly checker: IProductUniquenessChecker) {}

  /**
   * Đảm bảo Product name là duy nhất
   *
   * @param name Product name cần kiểm tra
   * @param excludeId ID của product đang update (để exclude khỏi check)
   * @throws ConflictException nếu name đã tồn tại (HTTP 409)
   */
  async ensureNameIsUnique(name: string, excludeId?: string): Promise<void> {
    const isUnique = await this.checker.isUnique('name', name, excludeId);

    if (!isUnique) {
      // Use ConflictException.duplicate() for semantic correctness
      throw ConflictException.duplicate('Product', 'name', name);
    }
  }

  /**
   * Đảm bảo Product SKU là duy nhất (nếu có SKU)
   *
   * @param sku Product SKU cần kiểm tra
   * @param excludeId ID của product đang update
   * @throws ConflictException nếu SKU đã tồn tại (HTTP 409)
   */
  async ensureSkuIsUnique(sku: string, excludeId?: string): Promise<void> {
    const isUnique = await this.checker.isUnique('sku', sku, excludeId);

    if (!isUnique) {
      throw ConflictException.duplicate('Product', 'sku', sku);
    }
  }

  /**
   * Validate tất cả uniqueness constraints
   *
   * @param params Params cần validate
   * @param excludeId ID để exclude (khi update)
   * @throws ConflictException with all violations if any duplicates found
   */
  async validateUniqueness(
    params: { name?: string; sku?: string },
    excludeId?: string,
  ): Promise<void> {
    const violations: Array<{ field: string; value: string }> = [];

    if (params.name) {
      const isNameUnique = await this.checker.isUnique(
        'name',
        params.name,
        excludeId,
      );
      if (!isNameUnique) {
        violations.push({ field: 'name', value: params.name });
      }
    }

    if (params.sku) {
      const isSkuUnique = await this.checker.isUnique(
        'sku',
        params.sku,
        excludeId,
      );
      if (!isSkuUnique) {
        violations.push({ field: 'sku', value: params.sku });
      }
    }

    if (violations.length > 0) {
      const message = violations
        .map((v) => `Product with ${v.field} '${v.value}' already exists`)
        .join('; ');

      throw new ConflictException(message, 'PRODUCT_UNIQUENESS_VIOLATION', {
        resourceType: 'Product',
        violations,
      });
    }
  }
}
