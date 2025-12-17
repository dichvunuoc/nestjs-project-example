import { IDomainEvent } from '../../../domain/events';

/**
 * External Event Bus Interface
 * 
 * Abstraction cho external message brokers (RabbitMQ, Kafka, etc.)
 * Khác với internal EventBus (in-memory), External Event Bus
 * publish events đến message broker để các services khác consume
 */
export interface IExternalEventBus {
  /**
   * Publish domain event đến external message broker
   */
  publish(event: IDomainEvent, routingKey?: string): Promise<void>;

  /**
   * Publish multiple events
   */
  publishBatch(events: IDomainEvent[], routingKey?: string): Promise<void>;

  /**
   * Subscribe to events từ external message broker
   */
  subscribe(
    eventType: string,
    handler: (event: IDomainEvent) => Promise<void>,
    options?: SubscriptionOptions,
  ): Promise<void>;

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string): Promise<void>;

  /**
   * Connect to message broker
   */
  connect(): Promise<void>;

  /**
   * Disconnect from message broker
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;
}

/**
 * Subscription Options
 */
export interface SubscriptionOptions {
  /**
   * Queue name (cho RabbitMQ) hoặc consumer group (cho Kafka)
   */
  queueName?: string;

  /**
   * Exchange name (cho RabbitMQ) hoặc topic (cho Kafka)
   */
  exchangeName?: string;

  /**
   * Routing key pattern
   */
  routingKey?: string;

  /**
   * Durable queue
   */
  durable?: boolean;

  /**
   * Auto acknowledge
   */
  autoAck?: boolean;

  /**
   * Prefetch count
   */
  prefetchCount?: number;
}

/**
 * Event Serialization
 */
export interface EventSerializer {
  serialize(event: IDomainEvent): Buffer | string;
  deserialize(data: Buffer | string): IDomainEvent;
}
