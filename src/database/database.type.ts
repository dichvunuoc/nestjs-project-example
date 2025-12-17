import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// 1. Định nghĩa Type cho Database (đầy đủ schema)
export type DrizzleDB = NodePgDatabase<typeof schema>;

// 2. Định nghĩa Type cho Transaction (Hơi phức tạp chút do Drizzle dùng HKT)
// Đây là type chính xác mà drizzle trả về trong callback .transaction(tx => ...)
export type DrizzleTransaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  any // ExtractTablesWithRelations<typeof schema> (để any cho gọn cũng được hoặc import type này)
>;

// 3. Tạo một Union Type để Repository dùng được cả 2 (Vì API giống nhau)
// Cả DB và Transaction đều có .select(), .insert(), .update()...
export type DrizzleExecutor = DrizzleDB | DrizzleTransaction;

// 4. Interface Options cụ thể cho Drizzle
export interface DrizzleRepositoryOptions {
  transaction?: DrizzleTransaction;
}
