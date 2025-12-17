import { IAggregateRepository } from '@core/infrastructure';
import { Product } from '../entities';

/**
 * Product Repository Interface (Port)
 *
 * Domain layer chỉ định nghĩa interface (Port)
 * Infrastructure layer sẽ implement (Adapter)
 *
 * Tuân theo Dependency Inversion Principle:
 * - Domain layer không phụ thuộc vào Infrastructure
 * - Application layer inject interface này, không inject implementation
 */
export interface IProductRepository extends IAggregateRepository<Product> {
  /**
   * Find product by name
   */
  findByName(name: string): Promise<Product | null>;

  /**
   * Find products by category
   */
  findByCategory(category: string): Promise<Product[]>;

  /**
   * Check if product name exists
   */
  existsByName(name: string): Promise<boolean>;
}
