import { ProductDto } from '../../dtos';

/**
 * Product Read DAO Interface (Port)
 *
 * Interface cho Read Side queries - định nghĩa ở Application Layer
 * Infrastructure Layer sẽ implement interface này (Adapter)
 *
 * Tuân theo Dependency Inversion Principle:
 * - Application layer định nghĩa interface (Port)
 * - Infrastructure layer implement (Adapter)
 * - Application layer không phụ thuộc vào Infrastructure
 */
export interface IProductReadDao {
  /**
   * Find product by ID
   */
  findById(id: string): Promise<ProductDto | null>;

  /**
   * Find many products với pagination và filters
   */
  findMany(options: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
  }): Promise<ProductDto[]>;
}
