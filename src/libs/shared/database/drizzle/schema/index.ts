/**
 * Drizzle Schema Exports
 *
 * Export tất cả table schemas
 */

import {
  orderItemsRelations,
  orderItemsTable,
  ordersRelations,
  ordersTable,
} from '@modules/order/infrastructure/persistence/drizzle/schema';
import { productsTable } from '@modules/product/infrastructure/persistence/drizzle/schema';
import {
  outboxStatusEnum,
  outboxTable,
} from '@shared/database/outbox/drizzle/schema/outbox.schema';

export const schema = {
  productsTable,
  ordersTable,
  orderItemsTable,
  ordersRelations,
  orderItemsRelations,
  outboxTable,
  outboxStatusEnum,
};
