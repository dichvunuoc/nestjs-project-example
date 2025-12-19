import { IAggregateRepository } from 'src/libs/core/domain';
import { Product } from '../entities';

/**
 * Product Repository Interface (Port) - WRITE SIDE ONLY
 *
 * Domain layer định nghĩa interface (Port) - Contract for persistence.
 * Infrastructure layer sẽ implement (Adapter) - Concrete persistence.
 *
 * ## CQRS Note
 *
 * This interface is for WRITE operations only.
 * Query operations should go through IProductReadDao (Read Side).
 *
 * Methods returning Domain Entities are allowed here because:
 * - They are used for loading aggregates before modification
 * - They support business rule validation (e.g., uniqueness check)
 *
 * ## Dependency Inversion Principle (DIP)
 *
 * - Domain layer KHÔNG phụ thuộc vào Infrastructure
 * - Application layer inject interface này, không inject implementation
 * - Import từ @core/domain (NOT @core/infrastructure)
 *
 * ## Clean Architecture Flow
 * ```
 * Domain (IProductRepository) ← Application (Handler) → Infrastructure (ProductRepository)
 * ```
 */
export interface IProductRepository extends IAggregateRepository<Product> {
  /**
   * Find product by name (exact match)
   *
   * Use case: Validate uniqueness before creating/updating product name
   *
   * @param name Product name to search
   * @returns Product if found, null otherwise
   */
  findByName(name: string): Promise<Product | null>;

  /**
   * Check if product name already exists (for uniqueness validation)
   *
   * More efficient than findByName() when you only need existence check.
   *
   * @param name Product name to check
   * @returns true if name exists, false otherwise
   */
  existsByName(name: string): Promise<boolean>;

  /**
   * Find products by category
   *
   * Use case: Load aggregates in a category for bulk operations
   *
   * Note: For read-only queries, prefer IProductReadDao.search()
   *
   * @param category Category to filter
   * @returns Array of products in the category
   */
  findByCategory(category: string): Promise<Product[]>;
}
