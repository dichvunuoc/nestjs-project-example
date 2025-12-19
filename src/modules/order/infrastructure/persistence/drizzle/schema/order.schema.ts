import {
  pgTable,
  varchar,
  integer,
  timestamp,
  decimal,
  text,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Orders Table Schema
 */
export const ordersTable = pgTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  shippingAddress: text('shipping_address').notNull(),
  version: integer('version').notNull().default(1),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Order Items Table Schema
 */
export const orderItemsTable = pgTable('order_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  orderId: varchar('order_id', { length: 36 })
    .notNull()
    .references(() => ordersTable.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 36 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Relations
 */
export const ordersRelations = relations(ordersTable, ({ many }) => ({
  items: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.orderId],
    references: [ordersTable.id],
  }),
}));

/**
 * Type definitions
 */
export type OrderRecord = typeof ordersTable.$inferSelect;
export type InsertOrderRecord = typeof ordersTable.$inferInsert;
export type OrderItemRecord = typeof orderItemsTable.$inferSelect;
export type InsertOrderItemRecord = typeof orderItemsTable.$inferInsert;
