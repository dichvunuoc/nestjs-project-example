import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

// Import từ Core (interfaces only)
import type {
  IEventBus,
  IOutboxRepository,
} from 'src/libs/core/infrastructure';
import { ConcurrencyException } from 'src/libs/core/common';
import { OUTBOX_REPOSITORY_TOKEN } from 'src/libs/core/constants';

// Import từ Shared (implementations)
import {
  BaseAggregateRepository,
  SaveOptions,
  EVENT_BUS_TOKEN,
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
  type DrizzleTransaction,
} from 'src/libs/shared';

// Import Domain & Ports
import { Product } from '../../../domain/entities';
import { IProductRepository } from '../../../domain/repositories';

// Import Infrastructure (Schema & Config)
import { productsTable, type ProductRecord } from '../drizzle/schema';
import { Price } from '@modules/product/domain/value-objects';

/**
 * Product Repository Implementation (Adapter) - WRITE SIDE ONLY
 *
 * Implements IProductRepository interface using Drizzle ORM.
 * Extends BaseAggregateRepository for automatic domain event publishing.
 *
 * ## CQRS Note
 *
 * This repository is for WRITE operations only:
 * - save() - Persist aggregate with events
 * - getById() - Load aggregate for modification
 * - delete() - Remove aggregate
 * - findByName() - Support uniqueness validation
 * - existsByName() - Support uniqueness validation
 * - findByCategory() - Load aggregates for bulk operations
 *
 * For READ operations (queries, search, statistics), use ProductReadDao.
 *
 * ## Event Publishing Strategy
 *
 * - With OutboxRepository: Uses Transactional Outbox Pattern (recommended)
 * - Without OutboxRepository: Uses direct event publishing (simpler but less reliable)
 *
 * ## Transactional Outbox Pattern
 *
 * When enabled, events are stored in the same transaction as the aggregate.
 * A separate worker (OutboxProcessor) polls and publishes events.
 * This guarantees at-least-once delivery even if the application crashes.
 */
@Injectable()
export class ProductRepository
  extends BaseAggregateRepository<Product>
  implements IProductRepository
{
  private readonly logger = new Logger(ProductRepository.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) protected readonly eventBus: IEventBus,
    @Optional()
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    outboxRepository?: IOutboxRepository,
  ) {
    // Enable outbox pattern if outboxRepository is provided
    super(eventBus, outboxRepository, {
      useOutbox: false, // Default to false, let Command Handler decide via save options (forceOutbox: true)
    });
  }

  /**
   * Persist aggregate to database with Optimistic Concurrency Control
   */
  protected async persist(
    aggregate: Product,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      // INSERT for new aggregate
      await db.insert(productsTable).values(persistenceModel);
    } else {
      // UPDATE with version check (OCC)
      const result = await db
        .update(productsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(productsTable.id, aggregate.id),
            eq(productsTable.version, expectedVersion),
          ),
        )
        .returning({ id: productsTable.id });

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
   * Get aggregate by ID for modification
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
   *
   * Note: For soft delete, use product.delete() method instead.
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(productsTable).where(eq(productsTable.id, id));
  }

  /**
   * Find product by name (exact match)
   *
   * Use case: Validate uniqueness before creating/updating product name
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
   *
   * Use case: Load aggregates in a category for bulk operations
   */
  async findByCategory(category: string): Promise<Product[]> {
    const results = await this.db
      .select()
      .from(productsTable)
      .where(eq(productsTable.category, category));

    return results.map((row) => this.toDomain(row));
  }

  /**
   * Check if product name already exists (for uniqueness validation)
   *
   * More efficient than findByName() when you only need existence check.
   */
  async existsByName(name: string): Promise<boolean> {
    const result = await this.db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.name, name))
      .limit(1);

    return result.length > 0;
  }

  // --- Mapping Methods ---

  /**
   * Map Domain Entity to Persistence Model
   */
  private toPersistence(aggregate: Product): ProductRecord {
    return {
      id: aggregate.id,
      name: aggregate.name,
      description: aggregate.description,
      priceAmount: aggregate.price.amount.toString(),
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
   * Map Persistence Model to Domain Entity
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
      row.isDeleted ? row.updatedAt : null, // Use updatedAt as deletedAt for soft-deleted items
    );
  }
}
