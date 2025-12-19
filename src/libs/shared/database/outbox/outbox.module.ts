import { Module, Global } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import { OutboxProcessorService } from './outbox-processor.service';
import { OUTBOX_REPOSITORY_TOKEN, OUTBOX_PROCESSOR_TOKEN } from 'src/libs/core';
import { SharedCqrsModule } from '../../cqrs';

/**
 * Outbox Module
 *
 * Provides Transactional Outbox Pattern implementation.
 *
 * Usage:
 * 1. Import this module in your DatabaseModule or AppModule
 * 2. Use BaseAggregateRepository with outbox support
 * 3. Events will be automatically persisted and published
 *
 * The OutboxProcessor starts automatically and polls for pending
 * events at a configurable interval.
 */
@Global()
@Module({
  imports: [SharedCqrsModule],
  providers: [
    // Repository implementation
    OutboxRepository,
    {
      provide: OUTBOX_REPOSITORY_TOKEN,
      useExisting: OutboxRepository,
    },
    // Processor implementation
    OutboxProcessorService,
    {
      provide: OUTBOX_PROCESSOR_TOKEN,
      useExisting: OutboxProcessorService,
    },
  ],
  exports: [
    OUTBOX_REPOSITORY_TOKEN,
    OUTBOX_PROCESSOR_TOKEN,
    OutboxRepository,
    OutboxProcessorService,
  ],
})
export class OutboxModule {}
