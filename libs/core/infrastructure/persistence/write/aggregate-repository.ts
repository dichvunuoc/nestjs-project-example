import { IAggregateRepository } from './interfaces/aggregate-repository.interface';
import { AggregateRoot } from '../../../domain/entities';
import { IEventBus } from '../../events/interfaces/event-bus.interface';
import { ConcurrencyException } from '../../../common/exceptions';

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
 * CRITICAL CONSISTENCY NOTE:
 * - Current implementation publishes events AFTER persist succeeds
 * - This creates a risk: If persist succeeds but publish fails, data inconsistency occurs
 * - For production systems, consider implementing Transactional Outbox Pattern:
 *   Store events in database (same transaction as aggregate), then have a worker publish them
 *
 * This ensures domain events are published when aggregate is saved,
 * connecting Write Side với Read Side (Projections).
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
   * 2. Persist aggregate to database với Optimistic Concurrency Control check
   * 3. Get domain events from aggregate
   * 4. Publish events via EventBus (parallel for performance)
   * 5. Clear events after successful publish
   *
   * @param aggregate Aggregate Root to save
   * @param options Optional transaction context
   * @returns Saved aggregate với updated version
   * @throws ConcurrencyException nếu version mismatch (Optimistic Concurrency Control)
   */
  async save(
    aggregate: TAggregate,
    options?: { transaction?: any },
  ): Promise<TAggregate> {
    // 1. Capture expected version (version cũ, trước khi domain layer increment)
    // Domain layer đã tự động increment version trong markAsUpdated()
    // Nên version hiện tại là version mới, cần version cũ để check
    // Nếu version = 0 (new aggregate), expectedVersion = 0
    const expectedVersion = aggregate.version > 0 ? aggregate.version - 1 : 0;

    try {
      // 2. Persist aggregate với Optimistic Concurrency Control
      // Subclass phải check: UPDATE ... WHERE id = ? AND version = expectedVersion
      // Nếu affectedRows === 0, throw ConcurrencyException
      // For new aggregates (version = 0), use INSERT instead of UPDATE
      await this.persist(aggregate, expectedVersion, options);

      // 3. Lấy events từ Domain Aggregate ra (deep copy)
      const events = aggregate.getDomainEvents();

      // 4. Dispatch events qua EventBus (parallel publishing để nhanh hơn)
      // CRITICAL: Nếu publish fails, aggregate đã được saved nhưng events lost
      // For production: Implement Transactional Outbox Pattern
      if (events.length > 0) {
        await Promise.all(events.map((event) => this.eventBus.publish(event)));
      }

      // 5. Clear events sau khi publish thành công
      aggregate.clearDomainEvents();

      return aggregate;
    } catch (error) {
      // Re-throw ConcurrencyException để caller có thể handle
      if (error instanceof ConcurrencyException) {
        throw error;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Persist aggregate to database với Optimistic Concurrency Control
   *
   * Subclasses MUST implement Optimistic Concurrency Control:
   * - Check version: UPDATE ... WHERE id = ? AND version = expectedVersion
   * - If affectedRows === 0, throw ConcurrencyException.versionMismatch()
   * - Increment version: SET version = version + 1
   *
   * Example SQL (PostgreSQL):
   * ```sql
   * UPDATE aggregates
   * SET data = ?, version = version + 1, updated_at = NOW()
   * WHERE id = ? AND version = ?
   * ```
   * Then check: if (result.rowCount === 0) throw ConcurrencyException
   *
   * @param aggregate Aggregate Root to persist
   * @param expectedVersion Version mong đợi (version cũ, trước khi increment)
   * @param options Optional transaction context
   * @throws ConcurrencyException nếu version mismatch
   */
  protected abstract persist(
    aggregate: TAggregate,
    expectedVersion: number,
    options?: { transaction?: any },
  ): Promise<void>;

  abstract getById(id: string): Promise<TAggregate | null>;
  abstract delete(id: string): Promise<void>;
}
