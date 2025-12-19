import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Logger, FactoryProvider } from '@nestjs/common';
import { DatabaseService } from './database.service';

import {
  DATABASE_WRITE_TOKEN,
  DATABASE_READ_TOKEN,
  UNIT_OF_WORK_TOKEN,
} from '@core';

export { DATABASE_WRITE_TOKEN, DATABASE_READ_TOKEN, UNIT_OF_WORK_TOKEN };

const logger = new Logger('DatabaseProvider');

/**
 * Create database pool with error handling
 */
function createPool(
  connectionString: string,
  poolName: string,
  databaseService: DatabaseService,
): Pool {
  const pool = new Pool({
    connectionString,
    min: 5,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    logger.error(
      `Unexpected error on idle ${poolName} database client: ${errorMessage}`,
      errorStack,
    );
  });

  databaseService.registerPool(poolName, pool);

  return pool;
}

/**
 * Create Drizzle database provider factory
 *
 * @param token - DI Token for the provider
 * @param poolName - Name for the pool ('WRITE' or 'READ')
 * @param schema - Database schema object
 * @param envVar - Environment variable name for connection string
 */
export function createDrizzleProvider<TSchema extends Record<string, unknown>>(
  token: symbol,
  poolName: string,
  schema: TSchema,
  envVar: string = 'DATABASE_URL',
): FactoryProvider {
  return {
    provide: token,
    useFactory: (
      configService: ConfigService,
      databaseService: DatabaseService,
    ) => {
      const connectionString = configService.get<string>(envVar);
      if (!connectionString) {
        throw new Error(`${envVar} is not set`);
      }
      const pool = createPool(connectionString, poolName, databaseService);
      return drizzle(pool, { schema });
    },
    inject: [ConfigService, DatabaseService],
  };
}
