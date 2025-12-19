import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';

/**
 * Generic Drizzle Database Type
 * Schema-agnostic type for use in shared library
 */
export type DrizzleDB<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = NodePgDatabase<TSchema>;

/**
 * Generic Drizzle Transaction Type
 */
export type DrizzleTransaction<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = PgTransaction<NodePgQueryResultHKT, TSchema, any>;

/**
 * Union Type for Repository - works with both DB and Transaction
 */
export type DrizzleExecutor<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = DrizzleDB<TSchema> | DrizzleTransaction<TSchema>;

/**
 * Repository Options with Drizzle Transaction
 */
export interface DrizzleRepositoryOptions<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> {
  transaction?: DrizzleTransaction<TSchema>;
}
