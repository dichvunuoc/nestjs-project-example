/**
 * Idempotent Command Interface
 *
 * Commands implementing this interface can be safely retried
 * without causing duplicate side effects.
 *
 * The idempotencyKey is used to identify duplicate requests.
 * If a command with the same key was already processed,
 * the cached result is returned instead of re-executing.
 *
 * @example
 * ```typescript
 * class CreateOrderCommand implements IIdempotentCommand {
 *   constructor(
 *     public readonly customerId: string,
 *     public readonly items: OrderItem[],
 *     public readonly idempotencyKey: string, // e.g., from client header
 *   ) {}
 * }
 *
 * // In handler with @Idempotent() decorator:
 * @Idempotent({ ttlSeconds: 3600 })
 * async execute(command: CreateOrderCommand): Promise<string> {
 *   // This will only run once per idempotencyKey
 *   return await this.createOrder(command);
 * }
 * ```
 */
export interface IIdempotentCommand {
  /**
   * Unique key identifying this specific command instance.
   *
   * Best practices for generating keys:
   * - Use client-generated UUID (passed in request header)
   * - Combine entity IDs with operation type
   * - Include timestamp for time-sensitive operations
   *
   * @example
   * - "create-order:customer-123:1703942400000"
   * - "payment:order-456:attempt-1"
   * - Request header: "X-Idempotency-Key: abc-123-def"
   */
  readonly idempotencyKey: string;
}

/**
 * Idempotency Options
 *
 * Configuration for idempotency behavior
 */
export interface IdempotencyOptions {
  /**
   * Time-to-live for cached results in seconds
   * After this time, the same key can execute again
   *
   * @default 3600 (1 hour)
   */
  ttlSeconds?: number;

  /**
   * Key prefix for cache storage
   * Helps organize and identify idempotency keys
   *
   * @default 'idempotency'
   */
  keyPrefix?: string;

  /**
   * Whether to throw error on duplicate (false) or return cached result (true)
   *
   * @default true (return cached result)
   */
  returnCachedResult?: boolean;
}

/**
 * Idempotency Result
 *
 * Stored result of an idempotent operation
 */
export interface IdempotencyResult<T = unknown> {
  /**
   * The result of the operation
   */
  result: T;

  /**
   * When the result was stored
   */
  storedAt: Date;

  /**
   * When the result expires
   */
  expiresAt: Date;

  /**
   * Original command that produced this result
   */
  commandType: string;
}
