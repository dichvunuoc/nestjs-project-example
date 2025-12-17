/**
 * Domain Event interface
 * Represents something that happened in the domain
 */
export interface IDomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  data: any;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };
}
