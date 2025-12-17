import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

// Import từ Core
import { BaseAggregateRepository, EVENT_BUS_TOKEN } from '@core';
import type { IEventBus } from '@core';
import { ConcurrencyException } from '@core/common';

// Import Domain & Ports
import { Product } from '../../../domain/entities';
import { IProductRepository } from '../../../domain/repositories';

// Import Infrastructure (Schema & Config)
import {
  productsTable,
  type ProductRecordInsert,
  type ProductRecord,
} from '../drizzle/schema';
import { DATABASE_WRITE_TOKEN } from 'src/database/database.provider'; // Điều chỉnh path nếu cần
import { Price } from '@modules/product/domain/value-objects';
import type { DrizzleDB, DrizzleTransaction } from 'src/database/database.type';

/**
 * Product Repository Implementation (Adapter)
 *
 * Implements IProductRepository interface using Drizzle ORM
 * Extends BaseAggregateRepository để tự động publish domain events
 */
@Injectable()
export class ProductRepository
  extends BaseAggregateRepository<Product>
  implements IProductRepository
{
  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) protected readonly eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  /**
   * Persist aggregate to database với Optimistic Concurrency Control
   * * @override
   */
  protected async persist(
    aggregate: Product,
    expectedVersion: number,
    options?: { transaction?: DrizzleTransaction },
  ): Promise<void> {
    const db = options?.transaction || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    // Chiến thuật: Dựa vào expectedVersion để quyết định Insert hay Update
    // Giúp tiết kiệm 1 query SELECT kiểm tra tồn tại
    if (expectedVersion === 0) {
      // Case 1: Tạo mới (Version 0 -> 1)
      await db.insert(productsTable).values(persistenceModel);
    } else {
      // Case 2: Cập nhật (Optimistic Locking)
      const result = await db
        .update(productsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(productsTable.id, aggregate.id),
            // Quan trọng: Chỉ update nếu version trong DB khớp với version lúc load lên
            eq(productsTable.version, expectedVersion),
          ),
        )
        .returning({ id: productsTable.id });

      // Nếu không có dòng nào được update -> Có người khác đã sửa trước đó
      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  /**
   * Get aggregate by ID
   */
  async getById(id: string): Promise<Product | null> {
    const result = await this.db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  /**
   * Delete aggregate (hard delete)
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(productsTable).where(eq(productsTable.id, id));
  }

  /**
   * Find product by name
   */
  async findByName(name: string): Promise<Product | null> {
    const result = await this.db
      .select()
      .from(productsTable)
      .where(eq(productsTable.name, name))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  /**
   * Find products by category
   */
  async findByCategory(category: string): Promise<Product[]> {
    const results = await this.db
      .select()
      .from(productsTable)
      .where(eq(productsTable.category, category));

    return results.map((row) => this.toDomain(row));
  }

  /**
   * Check if product name exists
   */
  async existsByName(name: string): Promise<boolean> {
    // Tối ưu: Chỉ select 1 trường (id) thay vì select *
    const result = await this.db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.name, name))
      .limit(1);

    return result.length > 0;
  }

  // =================================================================
  // PRIVATE MAPPERS (DRY Principle)
  // =================================================================

  /**
   * Map từ Domain Entity -> Drizzle Persistence Model
   */
  private toPersistence(aggregate: Product): ProductRecord {
    return {
      id: aggregate.id,
      name: aggregate.name,
      description: aggregate.description,
      // Chuyển đổi Value Object Price sang primitive types
      priceAmount: aggregate.price.amount.toString(), // Decimal trong DB thường lưu là string/numeric
      priceCurrency: aggregate.price.currency,
      stock: aggregate.stock,
      category: aggregate.category,
      version: aggregate.version,
      isDeleted: aggregate.isDeleted,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  /**
   * Map từ Drizzle Persistence Model -> Domain Entity
   */
  private toDomain(row: ProductRecord): Product {
    return Product.reconstitute(
      row.id,
      {
        name: row.name,
        description: row.description || '',
        price: new Price(parseFloat(row.priceAmount), row.priceCurrency),
        stock: row.stock,
        category: row.category,
      },
      row.version,
      row.createdAt,
      row.updatedAt,
    );
  }
}
