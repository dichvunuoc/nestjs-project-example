import { BaseException } from './base.exception';

/**
 * Concurrency Exception
 * Thrown khi Optimistic Concurrency Control phát hiện conflict
 * (version mismatch khi save aggregate)
 */
export class ConcurrencyException extends BaseException {
  constructor(
    message: string = 'Concurrency conflict: Aggregate version mismatch',
    public readonly aggregateId: string,
    public readonly expectedVersion?: number,
    public readonly actualVersion?: number,
  ) {
    super(message, 'CONCURRENCY_ERROR', {
      aggregateId,
      expectedVersion,
      actualVersion,
    });
  }

  /**
   * Static factory method cho version mismatch
   */
  static versionMismatch(
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number,
  ): ConcurrencyException {
    return new ConcurrencyException(
      `Concurrency conflict for Aggregate [${aggregateId}]: expected version ${expectedVersion}, but got ${actualVersion}`,
      aggregateId,
      expectedVersion,
      actualVersion,
    );
  }
}
