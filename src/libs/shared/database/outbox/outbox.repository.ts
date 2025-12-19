import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, lte, asc, sql } from 'drizzle-orm';
import {
  IOutboxRepository,
  IOutboxEntry,
  OutboxEntryStatus,
} from '@core/infrastructure';
import { IDomainEvent } from '@core/domain';
import { DATABASE_WRITE_TOKEN } from '../drizzle/database.provider';
import {
  outboxTable,
  type OutboxRecord,
} from './drizzle/schema/outbox.schema';
import type { DrizzleDB, DrizzleTransaction } from '../drizzle/database.type';

/**
 * Outbox Repository Implementation
 *
 * Implements the Transactional Outbox Pattern for reliable event publishing.
 *
 * Key features:
 * - Events are stored in the same transaction as the aggregate
 * - Polling-based processing with row-level locking
 * - Retry mechanism for failed events
 * - Cleanup of processed events
 */
@Injectable()
export class OutboxRepository implements IOutboxRepository {
  private readonly logger = new Logger(OutboxRepository.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  /**
   * Add a single event to the outbox
   */
  async add(event: IDomainEvent, transaction?: unknown): Promise<void> {
    const db = (transaction as DrizzleTransaction) || this.db;

    await db.insert(outboxTable).values({
      id: event.eventId,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      payload: JSON.stringify(event),
      status: 'PENDING',
      retryCount: 0,
    });

    this.logger.debug(
      `Added event to outbox: ${event.eventType} (${event.eventId})`,
    );
  }

  /**
   * Add multiple events to the outbox
   */
  async addMany(events: IDomainEvent[], transaction?: unknown): Promise<void> {
    if (events.length === 0) return;

    const db = (transaction as DrizzleTransaction) || this.db;

    const values = events.map((event) => ({
      id: event.eventId,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      payload: JSON.stringify(event),
      status: 'PENDING' as const,
      retryCount: 0,
    }));

    await db.insert(outboxTable).values(values);

    this.logger.debug(`Added ${events.length} events to outbox`);
  }

  /**
   * Get pending entries for processing
   *
   * Uses FOR UPDATE SKIP LOCKED to prevent multiple processors
   * from picking up the same events.
   */
  async getPending(limit: number): Promise<IOutboxEntry[]> {
    const results = await this.db
      .select()
      .from(outboxTable)
      .where(eq(outboxTable.status, 'PENDING'))
      .orderBy(asc(outboxTable.createdAt))
      .limit(limit);

    return results.map((result) => this.mapToEntry(result));
  }

  /**
   * Mark an entry as processing (acquire lock)
   *
   * Uses optimistic locking to prevent race conditions.
   * Returns true if successfully acquired, false if already taken.
   */
  async markAsProcessing(id: string): Promise<boolean> {
    const result = await this.db
      .update(outboxTable)
      .set({ status: 'PROCESSING' })
      .where(and(eq(outboxTable.id, id), eq(outboxTable.status, 'PENDING')))
      .returning({ id: outboxTable.id });

    return result.length > 0;
  }

  /**
   * Mark an entry as successfully processed
   */
  async markAsProcessed(id: string): Promise<void> {
    await this.db
      .update(outboxTable)
      .set({
        status: 'PROCESSED',
        processedAt: new Date(),
      })
      .where(eq(outboxTable.id, id));

    this.logger.debug(`Marked outbox entry as processed: ${id}`);
  }

  /**
   * Mark an entry as failed
   *
   * Increments retry count and stores error message.
   * Entry can be retried later if retry limit not exceeded.
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    await this.db
      .update(outboxTable)
      .set({
        status: 'FAILED',
        lastError: error,
        retryCount: sql`${outboxTable.retryCount} + 1`,
      })
      .where(eq(outboxTable.id, id));

    this.logger.warn(`Marked outbox entry as failed: ${id} - ${error}`);
  }

  /**
   * Reset failed entries for retry
   *
   * Moves failed entries back to PENDING if they haven't exceeded
   * the maximum retry count.
   */
  async resetForRetry(maxRetries: number): Promise<number> {
    const result = await this.db
      .update(outboxTable)
      .set({ status: 'PENDING' })
      .where(
        and(
          eq(outboxTable.status, 'FAILED'),
          sql`${outboxTable.retryCount} < ${maxRetries}`,
        ),
      )
      .returning({ id: outboxTable.id });

    if (result.length > 0) {
      this.logger.debug(`Reset ${result.length} failed entries for retry`);
    }

    return result.length;
  }

  /**
   * Delete processed entries older than specified date
   *
   * Cleanup job to prevent table from growing indefinitely.
   */
  async deleteProcessed(olderThan: Date): Promise<number> {
    const result = await this.db
      .delete(outboxTable)
      .where(
        and(
          eq(outboxTable.status, 'PROCESSED'),
          lte(outboxTable.processedAt, olderThan),
        ),
      )
      .returning({ id: outboxTable.id });

    if (result.length > 0) {
      this.logger.log(`Cleaned up ${result.length} processed outbox entries`);
    }

    return result.length;
  }

  /**
   * Get statistics about the outbox
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    processed: number;
    failed: number;
  }> {
    const result = await this.db
      .select({
        status: outboxTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(outboxTable)
      .groupBy(outboxTable.status);

    const stats = {
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
    };

    for (const row of result) {
      const key = row.status.toLowerCase() as keyof typeof stats;
      if (key in stats) {
        stats[key] = row.count;
      }
    }

    return stats;
  }

  /**
   * Map database record to IOutboxEntry
   */
  private mapToEntry(record: OutboxRecord): IOutboxEntry {
    return {
      id: record.id,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      eventType: record.eventType,
      payload: record.payload,
      status: record.status as OutboxEntryStatus,
      createdAt: record.createdAt,
      processedAt: record.processedAt,
      retryCount: record.retryCount,
      lastError: record.lastError,
    };
  }
}
