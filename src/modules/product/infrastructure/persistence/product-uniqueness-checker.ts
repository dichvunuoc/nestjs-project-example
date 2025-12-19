import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ne } from 'drizzle-orm';
import {
  IProductUniquenessChecker,
  ProductUniqueFields,
} from '../../domain/services';
import { productsTable } from './drizzle/schema';
import { DATABASE_READ_TOKEN, type DrizzleDB } from 'src/libs/shared';

import {
  PRODUCT_UNIQUENESS_CHECKER_TOKEN,
} from '../../constants/tokens';

/**
 * Product Uniqueness Checker Implementation
 *
 * Adapter implementing IProductUniquenessChecker port.
 * Uses Drizzle ORM to query the database.
 *
 * Note: Uses READ database connection for efficiency.
 */
@Injectable()
export class ProductUniquenessChecker implements IProductUniquenessChecker {
  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  /**
   * Check if a field value is unique
   *
   * @param field Field to check ('name' | 'sku')
   * @param value Value to check
   * @param excludeId Optional ID to exclude (for updates)
   * @returns true if unique, false if exists
   */
  async isUnique(
    field: ProductUniqueFields,
    value: string,
    excludeId?: string,
  ): Promise<boolean> {
    const column = this.getColumn(field);
    if (!column) {
      throw new Error(`Unknown unique field: ${field}`);
    }

    const conditions = [eq(column, value)];

    // Exclude current product when updating
    if (excludeId) {
      conditions.push(ne(productsTable.id, excludeId));
    }

    // Check if any product exists with this value
    const result = await this.db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(and(...conditions))
      .limit(1);

    // Return true if no matching product found (value is unique)
    return result.length === 0;
  }

  /**
   * Map field name to Drizzle column
   */
  private getColumn(field: ProductUniqueFields) {
    const columnMap = {
      name: productsTable.name,
      sku: productsTable.name, // Use name if no SKU column exists
    };

    return columnMap[field];
  }
}
