import {
  Injectable,
  Inject,
  Optional,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  IOutboxProcessor,
  type IOutboxRepository,
  IOutboxConfig,
} from '@core/infrastructure';
import {
  type IEventBus,
  EVENT_BUS_TOKEN,
  OUTBOX_REPOSITORY_TOKEN,
} from '@core';
import { IDomainEvent } from '@core/domain';

/**
 * Default Outbox Configuration
 */
const DEFAULT_CONFIG: IOutboxConfig = {
  pollingIntervalMs: 1000, // 1 second
  batchSize: 100,
  maxRetries: 3,
  retentionPeriodMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Outbox Processor Service
 *
 * Background service that polls the outbox table and publishes
 * pending events to the Event Bus.
 *
 * Features:
 * - Configurable polling interval
 * - Batch processing for efficiency
 * - Automatic retry of failed events
 * - Cleanup of old processed events
 * - Graceful shutdown support
 *
 * @example
 * ```typescript
 * // The processor starts automatically on module init
 * // But you can also control it manually:
 *
 * @Inject(OUTBOX_PROCESSOR_TOKEN)
 * private readonly outboxProcessor: IOutboxProcessor;
 *
 * // Stop processing
 * this.outboxProcessor.stop();
 *
 * // Start processing
 * this.outboxProcessor.start();
 * ```
 */
@Injectable()
export class OutboxProcessorService
  implements IOutboxProcessor, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OutboxProcessorService.name);
  private pollingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isRunning = false;
  private readonly config: IOutboxConfig;

  constructor(
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository: IOutboxRepository,
    @Inject(EVENT_BUS_TOKEN)
    private readonly eventBus: IEventBus,
    @Optional() config?: Partial<IOutboxConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start processing on module initialization
   */
  onModuleInit() {
    this.start();
  }

  /**
   * Stop processing on module destruction
   */
  onModuleDestroy() {
    this.stop();
  }

  /**
   * Start the outbox processor
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Outbox processor is already running');
      return;
    }

    this.isRunning = true;

    // Start polling for pending events
    this.pollingInterval = setInterval(() => {
      void this.processOutbox();
    }, this.config.pollingIntervalMs);

    // Start cleanup job (run every hour)
    this.cleanupInterval = setInterval(
      () => {
        void this.cleanupOldEntries();
      },
      60 * 60 * 1000,
    ); // 1 hour

    this.logger.log(
      `Outbox processor started (polling every ${this.config.pollingIntervalMs}ms)`,
    );
  }

  /**
   * Stop the outbox processor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.logger.log('Outbox processor stopped');
  }

  /**
   * Process pending outbox entries
   */
  async processOutbox(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending entries
      const entries = await this.outboxRepository.getPending(
        this.config.batchSize,
      );

      if (entries.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${entries.length} outbox entries`);

      // Process each entry
      for (const entry of entries) {
        await this.processEntry(entry.id, entry.payload);
      }

      // Reset failed entries for retry
      await this.outboxRepository.resetForRetry(this.config.maxRetries);
    } catch (error) {
      this.logger.error(
        'Error processing outbox',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single outbox entry
   */
  private async processEntry(id: string, payload: string): Promise<void> {
    // Try to acquire lock
    const acquired = await this.outboxRepository.markAsProcessing(id);
    if (!acquired) {
      // Already being processed by another instance
      return;
    }

    try {
      // Parse and publish event
      const event = JSON.parse(payload) as IDomainEvent;

      // Restore Date objects
      if ((event as { occurredAt?: unknown }).occurredAt) {
        (event as { occurredAt: Date }).occurredAt = new Date(
          (event as { occurredAt: string | Date }).occurredAt,
        );
      }

      await this.eventBus.publish(event);

      // Mark as processed
      await this.outboxRepository.markAsProcessed(id);

      this.logger.debug(`Published event: ${event.eventType} (${id})`);
    } catch (error) {
      // Mark as failed
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.outboxRepository.markAsFailed(id, errorMessage);

      this.logger.error(
        `Failed to process outbox entry ${id}: ${errorMessage}`,
      );
    }
  }

  /**
   * Cleanup old processed entries
   */
  private async cleanupOldEntries(): Promise<void> {
    try {
      const olderThan = new Date(Date.now() - this.config.retentionPeriodMs);
      const deleted = await this.outboxRepository.deleteProcessed(olderThan);

      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} old outbox entries`);
      }
    } catch (error) {
      this.logger.error(
        'Error cleaning up outbox entries',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
