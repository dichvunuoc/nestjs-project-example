import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Logger } from '@nestjs/common';
import { schema } from './schema';
import { DatabaseService } from './database.service';

export const DATABASE_WRITE_TOKEN = Symbol('DATABASE_WRITE_TOKEN');
export const DATABASE_READ_TOKEN = Symbol('DATABASE_READ_TOKEN');

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

  // Handle pool errors
  pool.on('error', (err) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    logger.error(
      `Unexpected error on idle ${poolName} database client: ${errorMessage}`,
      errorStack,
    );
  });

  // Register pool for graceful shutdown
  databaseService.registerPool(poolName, pool);

  return pool;
}

export const DRIZZLE_DB_WRITE_PROVIDER = {
  provide: DATABASE_WRITE_TOKEN,
  useFactory: (
    configService: ConfigService,
    databaseService: DatabaseService,
  ) => {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const pool = createPool(connectionString, 'WRITE', databaseService);
    return drizzle(pool, { schema });
  },
  inject: [ConfigService, DatabaseService],
};

export const DRIZZLE_DB_READ_PROVIDER = {
  provide: DATABASE_READ_TOKEN,
  useFactory: (
    configService: ConfigService,
    databaseService: DatabaseService,
  ) => {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const pool = createPool(connectionString, 'READ', databaseService);
    return drizzle(pool, { schema });
  },
  inject: [ConfigService, DatabaseService],
};
