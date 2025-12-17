import { Injectable, Logger } from '@nestjs/common';
import { IMessageBus, PublishOptions, SubscribeOptions } from '../message-bus.interface';
import { IDomainEvent } from '../../../domain/events';

/**
 * In-Memory Message Bus
 * 
 * Simple in-memory implementation for development/testing
 * Events are published synchronously to all subscribers
 * 
 * Note: This is NOT suitable for production - use RabbitMQ or Kafka adapter
 */
@Injectable()
export class InMemoryMessageBus implements IMessageBus {
  private readonly logger = new Logger(InMemoryMessageBus.name);
  private readonly subscribers: Map<string, Array<(event: IDomainEvent) => Promise<void>>> = new Map();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
    this.logger.log('In-memory message bus connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscribers.clear();
    this.logger.log('In-memory message bus disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish<T extends IDomainEvent>(
    event: T,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    const handlers = this.subscribers.get(event.eventType) || [];
    
    this.logger.debug(
      `Publishing event ${event.eventType} to ${handlers.length} subscriber(s)`,
      { exchange: options?.exchange, routingKey: options?.routingKey },
    );

    // Publish to all subscribers synchronously
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(
            `Error handling event ${event.eventType}:`,
            error instanceof Error ? error.stack : String(error),
          );
          // Continue with other handlers even if one fails
        }
      }),
    );
  }

  async subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType)!.push(handler as (event: IDomainEvent) => Promise<void>);
    
    this.logger.log(
      `Subscribed to event type: ${eventType}`,
      { queue: options?.queue, exchange: options?.exchange },
    );
  }

  async unsubscribe(eventType: string, handler: Function): Promise<void> {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.findIndex((h) => h === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.logger.log(`Unsubscribed from event type: ${eventType}`);
      }
    }
  }
}
