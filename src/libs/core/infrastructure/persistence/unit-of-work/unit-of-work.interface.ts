/**
 * Unit of Work Interface
 *
 * Manages transactions across multiple aggregate operations.
 * Implements the Unit of Work pattern for maintaining consistency.
 *
 * The Unit of Work:
 * - Tracks all changes made during a business transaction
 * - Commits all changes atomically (all succeed or all fail)
 * - Provides transaction context to repositories
 *
 * Usage:
 * ```typescript
 * await unitOfWork.execute(async (ctx) => {
 *   await orderRepository.save(order, ctx);
 *   await inventoryRepository.save(inventory, ctx);
 *   // If any save fails, both are rolled back
 * });
 * ```
 */
export interface IUnitOfWork {
  /**
   * Execute a business operation within a transaction
   *
   * @param work - The work to execute within the transaction
   * @returns The result of the work function
   * @throws Error if the transaction fails (all changes are rolled back)
   */
  runInTransaction<T>(
    work: (context: ITransactionContext) => Promise<T>,
  ): Promise<T>;
}

/**
 * Transaction Context Interface
 *
 * Provides access to the database transaction for repositories.
 * Repositories use this context to participate in the transaction.
 */
export interface ITransactionContext {
  /**
   * The underlying transaction object (database-specific)
   * For Drizzle ORM, this would be a DrizzleTransaction
   */
  readonly transaction: any;

  /**
   * Unique identifier for this transaction
   * Useful for logging and debugging
   */
  readonly transactionId: string;

  /**
   * Whether the transaction is still active
   */
  readonly isActive: boolean;
}
