import { IAggregateRepository } from '@core/domain';
import { AggregateRoot } from '@core/domain';
import { IDomainEvent } from '@core/domain';
import { IEventBus, IOutboxRepository } from '@core/infrastructure';
import { ConcurrencyException } from '@core/common';

/**
 * Save options for aggregate persistence
 */
export interface SaveOptions {
  /** Database transaction context */
  transaction?: unknown;
  /** Skip event publishing (useful for bulk operations) */
  skipEventPublishing?: boolean;
  /** Use outbox pattern even if direct publish is available */
  forceOutbox?: boolean;
}

/**
 * Repository configuration options
 */
export interface RepositoryConfig {
  /**
   * Enable Transactional Outbox Pattern
   *
   * When enabled:
   * - Events are stored in outbox table within same transaction
   * - OutboxProcessor publishes events asynchronously
   * - Guarantees at-least-once delivery
   *
   * When disabled:
   * - Events are published directly after persist
   * - Simpler but risk of inconsistency if publish fails
   *
   * @default false
   */
  useOutbox?: boolean;
}

/**
 * Base Aggregate Repository abstract class
 *
 * Abstract implementation of IAggregateRepository providing:
 * - Automatic domain events handling
 * - Optimistic Concurrency Control
 * - Optional Transactional Outbox Pattern support
 *
 * ## Event Publishing Strategies
 *
 * ### 1. Direct Publishing (Default)
 * ```typescript
 * class ProductRepository extends BaseAggregateRepository<Product> {
 *   constructor(eventBus: IEventBus) {
 *     super(eventBus);
 *   }
 * }
 * ```
 *
 * ### 2. Transactional Outbox Pattern (Recommended for Production)
 * ```typescript
 * class ProductRepository extends BaseAggregateRepository<Product> {
 *   constructor(eventBus: IEventBus, outboxRepository: IOutboxRepository) {
 *     super(eventBus, outboxRepository, { useOutbox: true });
 *   }
 * }
 * ```
 *
 * ## Usage Example
 * ```typescript
 * const product = Product.create(new ProductId('123'), props);
 * await repository.save(product);
 * // Events are automatically published or stored in outbox
 * ```
 */
export abstract class BaseAggregateRepository<
  TAggregate extends AggregateRoot,
> implements IAggregateRepository<TAggregate> {
  protected readonly config: Required<RepositoryConfig>;

  constructor(
    protected readonly eventBus: IEventBus,
    protected readonly outboxRepository?: IOutboxRepository,
    config?: RepositoryConfig,
  ) {
    this.config = {
      useOutbox: config?.useOutbox ?? false,
    };

    // Validate configuration
    if (this.config.useOutbox && !outboxRepository) {
      throw new Error(
        'OutboxRepository is required when useOutbox is enabled. ' +
          'Inject IOutboxRepository or disable useOutbox.',
      );
    }
  }

  /**
   * Save aggregate and handle domain events
   *
   * Flow:
   * 1. Calculate expected version for OCC
   * 2. Get pending domain events
   * 3. Persist aggregate (+ events if using outbox)
   * 4. Publish events (if not using outbox)
   * 5. Clear events from aggregate
   *
   * @param aggregate Aggregate to save
   * @param options Save options
   * @returns Saved aggregate
   * @throws ConcurrencyException if version mismatch
   */
  async save(
    aggregate: TAggregate,
    options?: SaveOptions,
  ): Promise<TAggregate> {
    const expectedVersion = aggregate.version > 0 ? aggregate.version - 1 : 0;
    const events = aggregate.getDomainEvents();
    const useOutbox = this.config.useOutbox || options?.forceOutbox === true;

    try {
      if (useOutbox && this.outboxRepository) {
        // Outbox Pattern: Persist aggregate + events in same transaction
        await this.persistWithOutbox(
          aggregate,
          expectedVersion,
          events,
          options,
        );
      } else {
        // Direct Pattern: Persist aggregate, then publish events
        await this.persist(aggregate, expectedVersion, options);

        if (!options?.skipEventPublishing && events.length > 0) {
          await this.publishEvents(events);
        }
      }

      aggregate.clearDomainEvents();

      return aggregate;
    } catch (error) {
      // Re-throw ConcurrencyException as-is
      if (error instanceof ConcurrencyException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Publish domain events directly to EventBus
   *
   * Used when Outbox Pattern is not enabled.
   * Events are published in parallel for performance.
   */
  protected async publishEvents(events: IDomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.eventBus.publish(event)));
  }

  /**
   * Persist aggregate AND events in same transaction (Outbox Pattern)
   *
   * Default implementation:
   * - Wraps persist() and outbox.addMany() in a transaction
   *
   * Override this method for custom transaction handling.
   *
   * @param aggregate Aggregate to persist
   * @param expectedVersion Expected version for OCC
   * @param events Domain events to store in outbox
   * @param options Save options including transaction
   */
  protected async persistWithOutbox(
    aggregate: TAggregate,
    expectedVersion: number,
    events: IDomainEvent[],
    options?: SaveOptions,
  ): Promise<void> {
    if (!this.outboxRepository) {
      throw new Error('OutboxRepository is required for Outbox Pattern');
    }

    // Persist aggregate
    await this.persist(aggregate, expectedVersion, options);

    // Add events to outbox (using same transaction)
    if (events.length > 0) {
      await this.outboxRepository.addMany(events, options?.transaction);
    }
  }

  /**
   * Persist aggregate to database with Optimistic Concurrency Control
   *
   * Subclasses MUST implement Optimistic Concurrency Control:
   * - Check version: UPDATE ... WHERE id = ? AND version = expectedVersion
   * - If affectedRows === 0, throw ConcurrencyException.versionMismatch()
   *
   * @param aggregate Aggregate to persist
   * @param expectedVersion Expected version for OCC
   * @param options Save options including transaction
   */
  protected abstract persist(
    aggregate: TAggregate,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void>;

  /**
   * Get aggregate by ID
   */
  abstract getById(id: string): Promise<TAggregate | null>;

  /**
   * Delete aggregate by ID
   */
  abstract delete(id: string): Promise<void>;
}
