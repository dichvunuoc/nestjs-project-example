import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IUnitOfWork, ITransactionContext } from './unit-of-work.interface';
import { DATABASE_WRITE_TOKEN } from '../../../../src/database/database.provider';
import type {
  DrizzleDB,
  DrizzleTransaction,
} from '../../../../src/database/database.type';

/**
 * Transaction Context Implementation
 */
class TransactionContext implements ITransactionContext {
  public isActive: boolean = true;

  constructor(
    public readonly transaction: DrizzleTransaction,
    public readonly transactionId: string = randomUUID(),
  ) {}

  markComplete(): void {
    this.isActive = false;
  }
}

/**
 * Drizzle Unit of Work Implementation
 *
 * Provides transaction management for Drizzle ORM with PostgreSQL.
 * Ensures ACID properties across multiple aggregate operations.
 *
 * Features:
 * - Automatic transaction management with execute()
 * - Manual transaction control with beginTransaction/commit/rollback
 * - Automatic rollback on errors
 * - Transaction ID for tracing
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   constructor(private readonly uow: DrizzleUnitOfWork) {}
 *
 *   async createOrderWithInventory(orderData, inventoryData) {
 *     return this.uow.execute(async (ctx) => {
 *       await this.orderRepo.save(order, { transaction: ctx.transaction });
 *       await this.inventoryRepo.save(inventory, { transaction: ctx.transaction });
 *       return order.id;
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class DrizzleUnitOfWork implements IUnitOfWork {
  private readonly logger = new Logger(DrizzleUnitOfWork.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  /**
   * Execute work within a transaction
   *
   * Uses Drizzle's transaction API to wrap the work function.
   * Automatically commits on success and rolls back on error.
   */
  async execute<T>(
    work: (context: ITransactionContext) => Promise<T>,
  ): Promise<T> {
    const transactionId = randomUUID();
    this.logger.debug(`Starting transaction: ${transactionId}`);

    try {
      // Use Drizzle's transaction method
      const result = await this.db.transaction(async (tx) => {
        const context = new TransactionContext(tx, transactionId);

        try {
          const workResult = await work(context);
          context.markComplete();
          return workResult;
        } catch (error) {
          context.markComplete();
          throw error; // Drizzle will rollback automatically
        }
      });

      this.logger.debug(`Transaction committed: ${transactionId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Transaction failed: ${transactionId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Begin a new transaction manually
   *
   * Note: For Drizzle ORM, we use the callback-based transaction API
   * in execute(). This method provides a simulated manual transaction
   * for compatibility, but execute() is preferred.
   */
  async beginTransaction(): Promise<ITransactionContext> {
    // For Drizzle, we can't easily create standalone transactions
    // This is a limitation - recommend using execute() instead
    this.logger.warn(
      'Manual transaction management is not fully supported with Drizzle. ' +
        'Use execute() for automatic transaction handling.',
    );

    // Return a placeholder context - actual transaction will be created in execute()
    const transactionId = randomUUID();
    return {
      transaction: null,
      transactionId,
      isActive: false,
    };
  }

  /**
   * Commit transaction
   * Note: With Drizzle's callback API, commit is automatic
   */
  async commit(context: ITransactionContext): Promise<void> {
    this.logger.debug(`Transaction commit requested: ${context.transactionId}`);
    // With Drizzle's callback-based API, commit is automatic on success
    // This method exists for interface compatibility
  }

  /**
   * Rollback transaction
   * Note: With Drizzle's callback API, rollback is automatic on error
   */
  async rollback(context: ITransactionContext): Promise<void> {
    this.logger.debug(
      `Transaction rollback requested: ${context.transactionId}`,
    );
    // With Drizzle's callback-based API, rollback is automatic on error
    // To force rollback, throw an error from within execute()
  }
}
