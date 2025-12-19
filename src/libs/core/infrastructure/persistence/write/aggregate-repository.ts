import { IAggregateRepository } from '../../../domain/repositories/aggregate-repository.interface';
import { AggregateRoot } from '../../../domain/entities';
import { IDomainEvent } from '../../../domain/events';
import { IEventBus } from '../../events/interfaces/event-bus.interface';
import { ConcurrencyException } from '../../../common/exceptions';
import { ITransactionContext } from '@core/infrastructure';

/**
 * Save options for aggregate persistence
 */
export interface SaveOptions {
  /** Database transaction context */
  transaction?: ITransactionContext;
  /** Skip event publishing (useful for bulk operations) */
  skipEventPublishing?: boolean;
}

/**
 * Base Aggregate Repository abstract class
 *
 * Abstract implementation của IAggregateRepository
 * Subclasses phải implement database-specific logic
 *
 * IMPORTANT: This class handles domain events publishing automatically:
 * 1. Save aggregate to database (persist) với Optimistic Concurrency Control
 * 2. Get domain events from aggregate
 * 3. Publish events via EventBus (triggers Projections)
 * 4. Clear events after successful publish
 *
 * CONSISTENCY STRATEGIES:
 *
 * 1. **Default (Current)**: Publish events after persist
 *    - Simple but has risk: persist succeeds, publish fails → inconsistency
 *    - Good for: Development, low-risk scenarios
 *
 * 2. **Transactional Outbox Pattern** (Recommended for Production):
 *    - Override `persistWithOutbox()` to store events in same transaction
 *    - Use separate worker to publish events from outbox table
 *    - Guarantees at-least-once delivery
 *
 * @example
 * ```typescript
 * class ProductRepository extends BaseAggregateRepository<Product> {
 *   // For Outbox Pattern, override:
 *   protected async persistWithOutbox(aggregate, expectedVersion, events, options) {
 *     await this.db.transaction(async (tx) => {
 *       await this.persistAggregate(aggregate, expectedVersion, tx);
 *       await this.saveEventsToOutbox(events, tx);
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseAggregateRepository<
  TAggregate extends AggregateRoot,
> implements IAggregateRepository<TAggregate> {
  constructor(protected readonly eventBus: IEventBus) {}

  /**
   * Save aggregate và publish domain events
   * This is the critical connection point between Write Side và Read Side
   *
   * Flow:
   * 1. Capture original version (before domain layer increments it)
   * 2. Get domain events from aggregate (before clearing)
   * 3. Persist aggregate to database với Optimistic Concurrency Control
   * 4. Publish events via EventBus (or store in Outbox)
   * 5. Clear events after successful operation
   *
   * @param aggregate Aggregate Root to save
   * @param options Optional save options
   * @returns Saved aggregate với updated version
   * @throws ConcurrencyException nếu version mismatch (Optimistic Concurrency Control)
   */
  async save(
    aggregate: TAggregate,
    options?: SaveOptions,
  ): Promise<TAggregate> {
    // 1. Capture expected version (version cũ, trước khi domain layer increment)
    // Domain layer đã tự động increment version trong markAsUpdated()
    // Nên version hiện tại là version mới, cần version cũ để check
    // Nếu version = 0 (new aggregate), expectedVersion = 0
    const expectedVersion = aggregate.version > 0 ? aggregate.version - 1 : 0;

    // 2. Lấy events từ Domain Aggregate ra (deep copy) TRƯỚC khi persist
    const events = aggregate.getDomainEvents();

    try {
      // 3. Check if subclass implements Outbox Pattern
      if (this.supportsOutboxPattern()) {
        // Use Transactional Outbox: persist aggregate + events in same transaction
        await this.persistWithOutbox(
          aggregate,
          expectedVersion,
          events,
          options,
        );
      } else {
        // Default: persist then publish (simpler but less reliable)
        await this.persist(aggregate, expectedVersion, options);

        // 4. Dispatch events qua EventBus
        if (!options?.skipEventPublishing && events.length > 0) {
          await this.publishEvents(events);
        }
      }

      // 5. Clear events sau khi thành công
      aggregate.clearDomainEvents();

      return aggregate;
    } catch (error) {
      // Re-throw ConcurrencyException để caller có thể handle
      if (error instanceof ConcurrencyException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Publish domain events to EventBus
   * Can be overridden for custom publishing logic
   *
   * @param events Events to publish
   */
  protected async publishEvents(events: IDomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.eventBus.publish(event)));
  }

  /**
   * Check if this repository supports Transactional Outbox Pattern
   * Override and return true if implementing persistWithOutbox()
   */
  protected supportsOutboxPattern(): boolean {
    return false;
  }

  /**
   * Persist aggregate AND events in same transaction (Outbox Pattern)
   *
   * Override this method to implement Transactional Outbox Pattern.
   * This ensures events are stored atomically with the aggregate.
   *
   * @param aggregate Aggregate to persist
   * @param expectedVersion Expected version for OCC
   * @param events Domain events to store in outbox
   * @param options Save options
   */
  protected async persistWithOutbox(
    _aggregate: TAggregate,
    _expectedVersion: number,
    _events: IDomainEvent[],
    _options?: SaveOptions,
  ): Promise<void> {
    throw new Error(
      'Outbox Pattern not implemented. Override persistWithOutbox() or set supportsOutboxPattern() to false.',
    );
  }

  /**
   * Persist aggregate to database với Optimistic Concurrency Control
   *
   * Subclasses MUST implement Optimistic Concurrency Control:
   * - Check version: UPDATE ... WHERE id = ? AND version = expectedVersion
   * - If affectedRows === 0, throw ConcurrencyException.versionMismatch()
   *
   * @example
   * ```typescript
   * protected async persist(aggregate: Product, expectedVersion: number): Promise<void> {
   *   if (expectedVersion === 0) {
   *     // INSERT for new aggregates
   *     await this.db.insert(table).values(this.toPersistence(aggregate));
   *   } else {
   *     // UPDATE with version check
   *     const result = await this.db.update(table)
   *       .set(this.toPersistence(aggregate))
   *       .where(and(eq(table.id, aggregate.id), eq(table.version, expectedVersion)));
   *
   *     if (result.rowCount === 0) {
   *       throw ConcurrencyException.versionMismatch(aggregate.id, expectedVersion, aggregate.version);
   *     }
   *   }
   * }
   * ```
   *
   * @param aggregate Aggregate Root to persist
   * @param expectedVersion Version mong đợi (version cũ, trước khi increment)
   * @param options Optional save options
   * @throws ConcurrencyException nếu version mismatch
   */
  protected abstract persist(
    aggregate: TAggregate,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void>;

  abstract getById(id: string): Promise<TAggregate | null>;
  abstract delete(id: string): Promise<void>;
}
