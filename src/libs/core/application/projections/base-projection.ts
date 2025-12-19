import { IProjection } from './interfaces/projection.interface';
import { IDomainEvent } from '../../domain/events';

/**
 * Logger interface for projection (Framework-agnostic)
 * Allows injecting any logger implementation
 */
export interface IProjectionLogger {
  log(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
}

/**
 * Simple console logger implementation (default fallback)
 */
class ConsoleProjectionLogger implements IProjectionLogger {
  constructor(private readonly context: string) {}

  log(message: string): void {
    console.log(`[${this.context}] ${message}`);
  }

  error(message: string, trace?: string): void {
    console.error(`[${this.context}] ERROR: ${message}`, trace);
  }

  warn(message: string): void {
    console.warn(`[${this.context}] WARN: ${message}`);
  }

  debug(message: string): void {
    console.debug(`[${this.context}] DEBUG: ${message}`);
  }
}

/**
 * Base Projection abstract class (Pure TypeScript - No Framework Dependency)
 *
 * Cung cấp nền tảng cho các Projection lắng nghe Domain Events và cập nhật Read Model.
 *
 * NOTE: This is an abstract class in Application layer.
 * - Do NOT add @Injectable() decorator here
 * - Subclasses in Infrastructure layer should add @Injectable()
 *
 * Projection có thể:
 * - Update SQL database (Denormalizer pattern)
 * - Update Redis cache
 * - Send notifications
 * - Update Elasticsearch index
 *
 * IDEMPOTENCY (Lũy đẳng) - Critical for projections:
 * - Insert: Check if exists → Ignore duplicate
 * - Update: Check version. Chỉ update nếu event.version > current_db_version
 * - Use eventId to track processed events
 *
 * @template TEvent - Type của Domain Event mà projection này xử lý
 *
 * @example
 * ```typescript
 * // In Infrastructure layer (can use @Injectable)
 * @Injectable()
 * class ProductReadModelProjection extends BaseProjection<ProductCreatedEvent> {
 *   constructor(
 *     private readonly readDb: DrizzleDB,
 *     @Inject(Logger) logger: IProjectionLogger, // Inject NestJS Logger
 *   ) {
 *     super(logger);
 *   }
 *
 *   async handle(event: ProductCreatedEvent): Promise<void> {
 *     // Update read model...
 *   }
 * }
 * ```
 */
export abstract class BaseProjection<
  TEvent extends IDomainEvent = IDomainEvent,
> implements IProjection<TEvent> {
  /**
   * Logger instance - injected or default console logger
   */
  protected readonly logger: IProjectionLogger;

  /**
   * Create projection with optional logger
   * @param logger Optional logger instance (defaults to console logger)
   */
  constructor(logger?: IProjectionLogger) {
    this.logger = logger || new ConsoleProjectionLogger(this.getName());
  }

  /**
   * Handle domain event và update Read Model
   * Subclasses must implement this method
   *
   * IMPORTANT: Ensure idempotency!
   * - Track processed eventIds to avoid duplicate processing
   * - Use version comparison for updates
   *
   * @param event Domain event to handle
   */
  abstract handle(event: TEvent): Promise<void>;

  /**
   * Get projection name cho logging và debugging
   * Default implementation returns class name
   * Can be overridden for custom naming
   *
   * @returns Projection class name
   */
  public getName(): string {
    return this.constructor.name;
  }

  /**
   * Check if event was already processed (for idempotency)
   * Override this method to implement event tracking
   *
   * @param eventId The event ID to check
   * @returns true if event was already processed
   */
  protected async isEventProcessed(_eventId: string): Promise<boolean> {
    // Default: don't track (subclass should implement)
    return false;
  }

  /**
   * Mark event as processed (for idempotency)
   * Override this method to implement event tracking
   *
   * @param eventId The event ID to mark as processed
   */
  protected async markEventProcessed(_eventId: string): Promise<void> {
    // Default: no-op (subclass should implement)
  }

  /**
   * Safely handle event with idempotency check and error handling
   *
   * @param event Domain event to handle
   */
  async safeHandle(event: TEvent): Promise<void> {
    try {
      // Check idempotency
      if (await this.isEventProcessed(event.eventId)) {
        this.logger.debug(`Event ${event.eventId} already processed, skipping`);
        return;
      }

      // Handle the event
      await this.handle(event);

      // Mark as processed
      await this.markEventProcessed(event.eventId);

      this.logger.debug(`Successfully processed event ${event.eventId}`);
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
        },
      );
      throw error; // Re-throw for retry mechanisms
    }
  }

  /**
   * Common error handler cho Read Side projections
   * Logs error với projection context
   *
   * @param error Error to handle
   * @param context Additional context (event type, aggregate ID, etc.)
   */
  protected handleError(error: Error, context?: Record<string, unknown>): void {
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    this.logger.error(
      `Projection failed: ${error.message}${contextStr}`,
      error.stack,
    );
  }
}
