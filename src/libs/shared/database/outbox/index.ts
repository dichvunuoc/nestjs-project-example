/**
 * Outbox Pattern Implementation
 *
 * Provides reliable event publishing using the Transactional Outbox Pattern.
 *
 * Components:
 * - OutboxRepository: Stores events in the database
 * - OutboxProcessorService: Polls and publishes pending events
 * - OutboxModule: NestJS module for easy integration
 */

export * from './outbox.repository';
export * from './outbox-processor.service';
export * from './outbox.module';
