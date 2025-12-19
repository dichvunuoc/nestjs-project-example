/**
 * Event Metadata interface
 * Contains contextual information about the event
 */
export interface IEventMetadata {
  /** ID of the user who triggered the event */
  userId?: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** ID of the event that caused this event */
  causationId?: string;
  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Domain Event interface (Type-safe with Generics)
 *
 * Represents something that happened in the domain.
 * Events are immutable facts that have already occurred.
 *
 * @template TData - Type of the event payload data
 *
 * @example
 * ```typescript
 * interface ProductCreatedData {
 *   name: string;
 *   price: number;
 * }
 *
 * class ProductCreatedEvent implements IDomainEvent<ProductCreatedData> {
 *   data: ProductCreatedData; // ← Type-safe!
 * }
 * ```
 */
export interface IDomainEvent<TData = unknown> {
  /** Unique identifier for this event instance */
  readonly eventId: string;

  /** Type/name of the event (e.g., 'ProductCreated', 'OrderShipped') */
  readonly eventType: string;

  /** ID of the aggregate that emitted this event */
  readonly aggregateId: string;

  /** Type of the aggregate (e.g., 'Product', 'Order') */
  readonly aggregateType: string;

  /** Timestamp when the event occurred */
  readonly occurredAt: Date;

  /** Event payload data - strongly typed */
  readonly data: TData;

  /** Optional metadata for tracing and context */
  readonly metadata?: IEventMetadata;
}

/**
 * Base class for creating Domain Events
 * Provides common functionality and ensures immutability
 *
 * @template TData - Type of the event payload data
 */
export abstract class BaseDomainEvent<
  TData = unknown,
> implements IDomainEvent<TData> {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly data: TData;
  readonly metadata?: IEventMetadata;

  protected constructor(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    data: TData,
    metadata?: IEventMetadata,
  ) {
    this.eventId = crypto.randomUUID();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventType = eventType;
    this.occurredAt = new Date();
    this.data = data;
    this.metadata = metadata;

    // Freeze the event to ensure immutability
    Object.freeze(this);
    Object.freeze(this.data);
  }
}
