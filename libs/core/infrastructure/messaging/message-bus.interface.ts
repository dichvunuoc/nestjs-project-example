import { IDomainEvent } from '../../domain/events';

/**
 * Publish Options
 */
export interface PublishOptions {
  /**
   * Exchange name (RabbitMQ) or Topic name (Kafka)
   */
  exchange?: string;

  /**
   * Routing key (RabbitMQ) or Partition key (Kafka)
   */
  routingKey?: string;

  /**
   * Message persistence
   * @default true
   */
  persistent?: boolean;

  /**
   * Message TTL (ms)
   */
  ttl?: number;

  /**
   * Priority (0-255)
   */
  priority?: number;

  /**
   * Additional headers
   */
  headers?: Record<string, any>;
}

/**
 * Subscribe Options
 */
export interface SubscribeOptions {
  /**
   * Queue name
   */
  queue?: string;

  /**
   * Exchange name (RabbitMQ) or Topic name (Kafka)
   */
  exchange?: string;

  /**
   * Routing key pattern (RabbitMQ) or Consumer group (Kafka)
   */
  routingKey?: string;

  /**
   * Durable queue (survives broker restart)
   * @default true
   */
  durable?: boolean;

  /**
   * Exclusive queue (deleted when connection closes)
   * @default false
   */
  exclusive?: boolean;

  /**
   * Auto-delete queue (deleted when no consumers)
   * @default false
   */
  autoDelete?: boolean;

  /**
   * Prefetch count (number of unacknowledged messages)
   * @default 10
   */
  prefetch?: number;

  /**
   * Consumer group (Kafka)
   */
  consumerGroup?: string;
}

/**
 * Message Bus Interface
 * 
 * Abstraction cho message queue implementations (RabbitMQ, Kafka, In-Memory)
 */
export interface IMessageBus {
  /**
   * Publish domain event to message queue
   */
  publish<T extends IDomainEvent>(
    event: T,
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Subscribe to domain events
   */
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void>;

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler: Function): Promise<void>;

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
