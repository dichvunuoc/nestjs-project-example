// Write Side - Repository implementations

export * from './aggregate-repository';

// Re-export IAggregateRepository from Domain layer for convenience
// Note: Prefer importing directly from '@core/domain' when possible
export type { IAggregateRepository } from '../../../domain/repositories/aggregate-repository.interface';
