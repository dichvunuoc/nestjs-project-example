import { ITransactionContext, IUnitOfWork } from 'src/libs/core/infrastructure';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { DATABASE_WRITE_TOKEN } from '../database.provider';

type DrizzleDB<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = NodePgDatabase<TSchema>;

type DrizzleTransaction<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = PgTransaction<NodePgQueryResultHKT, TSchema, any>;

type PgTransactionConfig = {
  isolationLevel?:
    | 'read uncommitted'
    | 'read committed'
    | 'repeatable read'
    | 'serializable';
  accessMode?: 'read only' | 'read write';
  deferrable?: boolean;
};

/**
 * Transaction Context Implementation
 */
class TransactionContext implements ITransactionContext {
  private _isActive: boolean = true;

  constructor(
    public readonly transaction: DrizzleTransaction,
    public readonly transactionId: string = randomUUID(),
  ) {}

  get isActive(): boolean {
    return this._isActive;
  }

  markComplete(): void {
    this._isActive = false;
  }
}

export interface TransactionOptions {
  /**
   * Transaction isolation level
   * @default 'read committed'
   */
  isolationLevel?:
    | 'read uncommitted'
    | 'read committed'
    | 'repeatable read'
    | 'serializable';

  /**
   * Transaction timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether this is a read-only transaction
   * @default false
   */
  readOnly?: boolean;
}

@Injectable()
export class DrizzleUnitOfWork implements IUnitOfWork {
  private readonly logger = new Logger(DrizzleUnitOfWork.name);
  private activeTransactions = new Map<string, TransactionContext>();
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  /**
   * Execute work within a transaction
   */
  async runInTransaction<T>(
    work: (context: ITransactionContext) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const transactionId = randomUUID();
    const startTime = Date.now();

    this.logger.debug(`Starting transaction: ${transactionId}`, {
      options,
      activeCount: this.activeTransactions.size,
    });

    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(`Transaction timeout after ${timeout}ms: ${transactionId}`),
        );
      }, timeout);
    });

    try {
      const result = await Promise.race([
        this.executeTransaction(transactionId, work, options),
        timeoutPromise,
      ]);

      const duration = Date.now() - startTime;
      this.logger.debug(`Transaction committed: ${transactionId}`, {
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Transaction failed: ${transactionId}`, {
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      this.activeTransactions.delete(transactionId);
    }
  }

  private async executeTransaction<T>(
    transactionId: string,
    work: (context: ITransactionContext) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return await this.db.transaction(
      async (tx) => {
        const context = new TransactionContext(
          tx as DrizzleTransaction,
          transactionId,
        );
        this.activeTransactions.set(transactionId, context);

        if (options?.isolationLevel) {
          await this.setIsolationLevel(
            tx as DrizzleTransaction,
            options.isolationLevel,
          );
        }

        if (options?.readOnly) {
          await (tx as { execute: (sql: string) => Promise<unknown> }).execute(
            'SET TRANSACTION READ ONLY',
          );
        }

        try {
          const workResult = await work(context);

          if (!context.isActive) {
            throw new Error('Transaction context is no longer active');
          }

          context.markComplete();
          return workResult;
        } catch (error) {
          context.markComplete();
          throw error;
        }
      },
      {
        accessMode: options?.readOnly ? 'read only' : 'read write',
      } as PgTransactionConfig,
    );
  }

  private async setIsolationLevel(
    tx: DrizzleTransaction,
    level: NonNullable<TransactionOptions['isolationLevel']>,
  ): Promise<void> {
    // Use the level directly since it matches what PostgreSQL expects
    await (tx as { execute: (sql: string) => Promise<unknown> }).execute(
      `SET TRANSACTION ISOLATION LEVEL ${level}`,
    );
  }

  /**
   * @deprecated Use execute() instead
   */
  async beginTransaction(): Promise<ITransactionContext> {
    this.logger.warn(
      'Manual transaction management is not fully supported with Drizzle. ' +
        'Use execute() for automatic transaction handling.',
    );

    const transactionId = randomUUID();

    return {
      transaction: null as DrizzleTransaction | null,
      transactionId,
      isActive: false,
    };
  }

  /**
   * @deprecated Use execute() instead
   */
  async commit(context: ITransactionContext): Promise<void> {
    this.logger.debug(`Transaction commit requested: ${context.transactionId}`);

    if (!context.isActive) {
      this.logger.warn(
        `Attempting to commit inactive transaction: ${context.transactionId}`,
      );
    }
  }

  /**
   * @deprecated Use execute() and throw errors instead
   */
  async rollback(context: ITransactionContext): Promise<void> {
    this.logger.debug(
      `Transaction rollback requested: ${context.transactionId}`,
    );

    if (!context.isActive) {
      this.logger.warn(
        `Attempting to rollback inactive transaction: ${context.transactionId}`,
      );
    }
  }

  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  getActiveTransactionIds(): string[] {
    return Array.from(this.activeTransactions.keys());
  }

  isTransactionActive(transactionId: string): boolean {
    const context = this.activeTransactions.get(transactionId);
    return context?.isActive ?? false;
  }
}
