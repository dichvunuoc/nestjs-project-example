import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { IMessageBus, PublishOptions, SubscribeOptions } from './message-bus.interface';
import { IDomainEvent } from '../../domain/events';
import { InMemoryMessageBus } from './adapters/in-memory-message-bus';
import { RabbitMQMessageBus } from './adapters/rabbitmq-message-bus';
import { KafkaMessageBus } from './adapters/kafka-message-bus';

/**
 * Message Bus Type
 */
export type MessageBusType = 'in-memory' | 'rabbitmq' | 'kafka';

/**
 * Message Bus Service
 * 
 * Facade service that wraps different message bus implementations
 * Automatically selects implementation based on environment or configuration
 * 
 * Usage:
 * ```typescript
 * constructor(private readonly messageBus: MessageBusService) {}
 * 
 * await this.messageBus.publish(event);
 * await this.messageBus.subscribe('ProductCreated', handler);
 * ```
 */
@Injectable()
export class MessageBusService implements IMessageBus {
  private readonly logger = new Logger(MessageBusService.name);
  private readonly bus: IMessageBus;

  constructor(
    @Optional() @Inject('MESSAGE_BUS') customBus?: IMessageBus,
  ) {
    // Use custom bus if provided, otherwise auto-detect
    if (customBus) {
      this.bus = customBus;
      this.logger.log('Using custom message bus implementation');
    } else {
      this.bus = this.createDefaultBus();
    }
  }

  /**
   * Create default message bus based on environment
   */
  private createDefaultBus(): IMessageBus {
    const busType = (process.env.MESSAGE_BUS_TYPE || 'in-memory') as MessageBusType;

    switch (busType) {
      case 'rabbitmq':
        this.logger.log('Using RabbitMQ message bus');
        return new RabbitMQMessageBus();
      
      case 'kafka':
        this.logger.log('Using Kafka message bus');
        return new KafkaMessageBus();
      
      case 'in-memory':
      default:
        this.logger.log('Using in-memory message bus (development mode)');
        return new InMemoryMessageBus();
    }
  }

  async publish<T extends IDomainEvent>(
    event: T,
    options?: PublishOptions,
  ): Promise<void> {
    return this.bus.publish(event, options);
  }

  async subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void> {
    return this.bus.subscribe(eventType, handler, options);
  }

  async unsubscribe(eventType: string, handler: Function): Promise<void> {
    return this.bus.unsubscribe(eventType, handler);
  }

  async connect(): Promise<void> {
    return this.bus.connect();
  }

  async disconnect(): Promise<void> {
    return this.bus.disconnect();
  }

  isConnected(): boolean {
    return this.bus.isConnected();
  }
}
