import { ITransactionContext } from '@core/infrastructure';
import { AggregateRoot } from '../entities';

/**
 * Aggregate Repository interface (Write Only)
 *
 * Trong CQRS/DDD, Repository này chỉ làm việc với Aggregate Root:
 * - Save: Lưu aggregate và publish domain events
 * - GetById: Lấy aggregate theo ID để modify
 *
 * KHÔNG có findAll, update, delete vì:
 * - Query operations thuộc về Read Model (Query Side)
 * - Update/Delete được thực hiện thông qua Aggregate Root methods
 *
 * Repository này chỉ dùng ở Command Side (Write Model)
 *
 * Note: Transaction support is optional. If provided, persist operations
 * should use the transaction context. For production systems, consider
 * implementing Transactional Outbox Pattern để đảm bảo event publishing
 * trong cùng transaction với aggregate persistence.
 */
export interface IAggregateRepository<TAggregate extends AggregateRoot> {
  /**
   * Save aggregate và publish domain events
   *
   * @param aggregate Aggregate Root cần save
   * @param options Optional transaction context (for database transactions)
   * @returns Saved aggregate với updated version
   * @throws ConcurrencyException nếu version mismatch (Optimistic Concurrency Control)
   */
  save(
    aggregate: TAggregate,
    options?: { transaction?: ITransactionContext },
  ): Promise<TAggregate>;

  /**
   * Get aggregate by ID để modify
   * @param id Aggregate ID
   * @returns Aggregate Root hoặc null nếu không tìm thấy
   */
  getById(id: string): Promise<TAggregate | null>;

  /**
   * Delete aggregate
   * @param id Aggregate ID
   */
  delete(id: string): Promise<void>;
}
