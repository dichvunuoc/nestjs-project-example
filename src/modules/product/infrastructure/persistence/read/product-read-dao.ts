import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { BaseReadDao } from '@core/infrastructure';
import { ProductDto } from '../../../application/dtos';
import { IProductReadDao } from '../../../application/queries/ports';
import { productsTable } from '../drizzle/schema';
import { DATABASE_READ_TOKEN } from 'src/database/database.provider';
import { schema } from 'src/database/schema';

/**
 * Product Read DAO Implementation
 *
 * Optimized cho read operations
 * Uses Drizzle ORM for efficient queries
 */
@Injectable()
export class ProductReadDao extends BaseReadDao implements IProductReadDao {
  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  /**
   * Execute raw SQL query (required by BaseReadDao)
   */
  protected async executeQuery<T = any>(
    sql: string,
    params?: any[],
  ): Promise<T[]> {
    const result = await this.db.execute(sql as any);
    return result.rows as T[];
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<ProductDto | null> {
    const result = await this.db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, id), eq(productsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return new ProductDto(
      row.id,
      row.name,
      row.description || '',
      parseFloat(row.priceAmount),
      row.priceCurrency,
      row.stock,
      row.category,
      row.version,
      row.createdAt,
      row.updatedAt,
    );
  }

  /**
   * Find many products với pagination và filters
   */
  async findMany(options: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
  }): Promise<ProductDto[]> {
    const offset = (options.page - 1) * options.limit;
    const conditions = [eq(productsTable.isDeleted, false)];

    if (options.category) {
      conditions.push(eq(productsTable.category, options.category));
    }

    if (options.search) {
      conditions.push(
        or(
          like(productsTable.name, `%${options.search}%`),
          like(productsTable.description, `%${options.search}%`),
        )!,
      );
    }

    const results = await this.db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .limit(options.limit)
      .offset(offset)
      .orderBy(productsTable.createdAt);

    return results.map(
      (row) =>
        new ProductDto(
          row.id,
          row.name,
          row.description || '',
          parseFloat(row.priceAmount),
          row.priceCurrency,
          row.stock,
          row.category,
          row.version,
          row.createdAt,
          row.updatedAt,
        ),
    );
  }
}
