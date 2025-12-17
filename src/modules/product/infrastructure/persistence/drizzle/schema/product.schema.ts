import {
  pgTable,
  varchar,
  integer,
  decimal,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Product Table Schema (Drizzle ORM)
 *
 * This schema represents the write model for Product aggregate
 * In CQRS, this is the source of truth for write operations
 */
export const productsTable = pgTable('products', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  priceAmount: decimal('price_amount', { precision: 10, scale: 2 }).notNull(),
  priceCurrency: varchar('price_currency', { length: 3 })
    .notNull()
    .default('USD'),
  stock: integer('stock').notNull().default(0),
  category: varchar('category', { length: 100 }).notNull(),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ProductRecord = typeof productsTable.$inferSelect;
export type ProductRecordInsert = typeof productsTable.$inferInsert;
