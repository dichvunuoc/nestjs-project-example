/**
 * DI Tokens for interfaces (Ports in Hexagonal Architecture)
 *
 * These symbols are used for dependency injection.
 * Implementations are provided in @shared module.
 *
 * Naming Convention:
 * - Interfaces: I{Name}
 * - Tokens: {NAME}_TOKEN
 *
 * @example
 * ```typescript
 * // In module providers
 * {
 *   provide: COMMAND_BUS_TOKEN,
 *   useExisting: NestCommandBus,
 * }
 *
 * // In constructor
 * constructor(
 *   @Inject(COMMAND_BUS_TOKEN)
 *   private readonly commandBus: ICommandBus,
 * ) {}
 * ```
 */

// =============================================================================
// CQRS Tokens
// =============================================================================
export const COMMAND_BUS_TOKEN = Symbol('ICommandBus');
export const QUERY_BUS_TOKEN = Symbol('IQueryBus');
export const EVENT_BUS_TOKEN = Symbol('IEventBus');

// =============================================================================
// Persistence Tokens
// =============================================================================
export const UNIT_OF_WORK_TOKEN = Symbol('IUnitOfWork');
export const DATABASE_WRITE_TOKEN = Symbol('DATABASE_WRITE_TOKEN');
export const DATABASE_READ_TOKEN = Symbol('DATABASE_READ_TOKEN');

// =============================================================================
// Outbox Pattern Tokens
// =============================================================================
export const OUTBOX_REPOSITORY_TOKEN = Symbol('IOutboxRepository');
export const OUTBOX_PROCESSOR_TOKEN = Symbol('IOutboxProcessor');

// =============================================================================
// Caching Tokens
// =============================================================================
export const CACHE_SERVICE_TOKEN = Symbol('ICacheService');

// =============================================================================
// Context Tokens
// =============================================================================
export const REQUEST_CONTEXT_TOKEN = Symbol('IRequestContextProvider');
