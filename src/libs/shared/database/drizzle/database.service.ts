import {
  Injectable,
  OnModuleDestroy,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Database Service
 * Manages database connection lifecycle and graceful shutdown
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pools: Map<string, Pool> = new Map();

  /**
   * Register a database pool for graceful shutdown
   */
  registerPool(name: string, pool: Pool): void {
    this.pools.set(name, pool);
    this.logger.log(`Registered database pool: ${name}`);
  }

  /**
   * Get pool instance by name
   */
  getPool(name: string): Pool | null {
    return this.pools.get(name) || null;
  }

  /**
   * Get pool statistics
   */
  getPoolStats(name: string): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } | null {
    const pool = this.pools.get(name);
    if (!pool) {
      return null;
    }
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }

  /**
   * Connection retry logic with exponential backoff
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(
            `Database connection attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${lastError.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Connection failed after all retry attempts');
  }

  /**
   * Check database connection health
   */
  async checkConnection(poolName: string = 'WRITE'): Promise<boolean> {
    const pool = this.getPool(poolName);
    if (!pool) {
      this.logger.error(`Pool ${poolName} not found`);
      return false;
    }

    try {
      await this.withRetry(async () => {
        const client = await pool.connect();
        try {
          await client.query('SELECT 1');
        } finally {
          client.release();
        }
      });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Database connection health check failed for pool ${poolName}: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  /**
   * Close a specific pool
   */
  async closePool(name: string): Promise<void> {
    const pool = this.pools.get(name);
    if (!pool) {
      this.logger.warn(`Pool ${name} not found, skipping`);
      return;
    }

    try {
      const stats = this.getPoolStats(name);
      this.logger.log(
        `Closing database pool: ${name} (total: ${stats?.totalCount}, idle: ${stats?.idleCount}, waiting: ${stats?.waitingCount})`,
      );

      await pool.end();
      this.pools.delete(name);

      this.logger.log(`Database pool ${name} closed successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error closing database pool ${name}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Close all database pools
   */
  async closeAllPools(): Promise<void> {
    if (this.pools.size === 0) {
      this.logger.log('No database pools to close');
      return;
    }

    this.logger.log(`Closing ${this.pools.size} database pool(s)`);

    const closePromises = Array.from(this.pools.keys()).map((name) =>
      this.closePool(name).catch((error) => {
        this.logger.error(
          `Failed to close pool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }),
    );

    await Promise.all(closePromises);

    this.logger.log('All database pools closed');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Database module is being destroyed');
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Application is shutting down (signal: ${signal || 'unknown'}), closing database connections`,
    );

    try {
      await this.closeAllPools();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error during database shutdown: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
