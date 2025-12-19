/**
 * @core - Pure Abstractions Only
 *
 * This library contains ONLY:
 * - Interfaces (Ports)
 * - Abstract classes
 * - Base exceptions
 * - DI Tokens/Constants
 *
 * NO NestJS imports | NO Drizzle | NO Business Logic
 *
 * For implementations, use @shared instead.
 */

// Domain Layer - Core business logic building blocks
export * from './domain';

// Application Layer - Use case interfaces
export * from './application';

// Infrastructure Layer - Infrastructure interfaces (Ports)
export * from './infrastructure';

// Common - Base exceptions
export * from './common';

// Constants - DI Tokens
export * from './constants';
