/**
 * Infrastructure Layer - Interfaces (Ports) Only
 *
 * Contains only interfaces for infrastructure concerns.
 * Implementations are in @shared.
 */

// Persistence interfaces
export * from './persistence';

// Event Bus interface
export * from './events';

// Caching interface
export * from './caching';

// Outbox Pattern interfaces
export * from './outbox';
