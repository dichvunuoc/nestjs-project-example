import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from 'src/libs/shared/cqrs';
import { IEventHandler } from 'src/libs/core/application';
import { ProductCreatedEvent } from '../../domain/events';

/**
 * Audit handler for ProductCreatedEvent
 *
 * Subscribes to the custom domain event bus and logs audit information
 * whenever a product is created.
 */
@Injectable()
@EventsHandler(ProductCreatedEvent)
export class ProductCreatedAuditHandler implements IEventHandler<ProductCreatedEvent> {
  private readonly logger = new Logger(ProductCreatedAuditHandler.name);

  async handle(event: ProductCreatedEvent): Promise<void> {
    this.logger.log(
      `Audit ProductCreated: ${JSON.stringify({
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        data: event.data,
        correlationId: event.metadata?.correlationId,
        timestamp: event.occurredAt,
      })}`,
    );
  }
}
