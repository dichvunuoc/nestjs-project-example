import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IMessageBus, PublishOptions, SubscribeOptions } from '../message-bus.interface';
import { IDomainEvent } from '../../../domain/events';

/**
 * RabbitMQ Message Bus
 * 
 * Production-ready RabbitMQ implementation
 * 
 * Dependencies required:
 * - amqplib: npm install amqplib
 * - @types/amqplib: npm install -D @types/amqplib
 * 
 * Environment variables:
 * - RABBITMQ_URL: amqp://user:password@host:5672
 * - RABBITMQ_EXCHANGE: domain-events (default)
 */
@Injectable()
export class RabbitMQMessageBus implements IMessageBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQMessageBus.name);
  private connection: any = null;
  private channel: any = null;
  private readonly subscribers: Map<string, any> = new Map();
  private readonly defaultExchange = process.env.RABBITMQ_EXCHANGE || 'domain-events';
  private readonly rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import để tránh lỗi nếu amqplib chưa được cài
      const amqp = await import('amqplib');
      
      this.connection = await amqp.connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare default exchange
      await this.channel.assertExchange(this.defaultExchange, 'topic', {
        durable: true,
      });

      this.logger.log(`Connected to RabbitMQ at ${this.rabbitmqUrl}`);
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Unsubscribe all
      for (const [eventType, consumerTag] of this.subscribers.entries()) {
        if (consumerTag && this.channel) {
          await this.channel.cancel(consumerTag);
        }
      }
      this.subscribers.clear();

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.connection.readyState === 'open';
  }

  async publish<T extends IDomainEvent>(
    event: T,
    options: PublishOptions = {},
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('RabbitMQ not connected');
    }

    const exchange = options.exchange || this.defaultExchange;
    const routingKey = options.routingKey || event.eventType;
    const message = JSON.stringify(event);
    const buffer = Buffer.from(message);

    const publishOptions: any = {
      persistent: options.persistent !== false,
      ...(options.ttl && { expiration: options.ttl.toString() }),
      ...(options.priority && { priority: options.priority }),
      ...(options.headers && { headers: options.headers }),
      timestamp: Date.now(),
      messageId: (event as any).id || `${event.eventType}-${Date.now()}`,
    };

    const published = this.channel.publish(
      exchange,
      routingKey,
      buffer,
      publishOptions,
    );

    if (!published) {
      // Channel buffer is full, wait for drain event
      await new Promise((resolve) => {
        this.channel.once('drain', resolve);
      });
    }

    this.logger.debug(`Published event ${event.eventType} to ${exchange}/${routingKey}`);
  }

  async subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
    options: SubscribeOptions = {},
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('RabbitMQ not connected');
    }

    const exchange = options.exchange || this.defaultExchange;
    const routingKey = options.routingKey || eventType;
    const queue = options.queue || `${eventType}-queue`;
    const durable = options.durable !== false;
    const exclusive = options.exclusive === true;
    const autoDelete = options.autoDelete === true;

    // Declare queue
    await this.channel.assertQueue(queue, {
      durable,
      exclusive,
      autoDelete,
    });

    // Bind queue to exchange
    await this.channel.bindQueue(queue, exchange, routingKey);

    // Set prefetch
    if (options.prefetch) {
      await this.channel.prefetch(options.prefetch);
    }

    // Consume messages
    const consumerTag = await this.channel.consume(
      queue,
      async (msg: any) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString()) as T;
          await handler(event);
          this.channel.ack(msg);
          this.logger.debug(`Processed event ${eventType} from queue ${queue}`);
        } catch (error) {
          this.logger.error(
            `Error processing event ${eventType}:`,
            error instanceof Error ? error.stack : String(error),
          );
          
          // Reject message (requeue based on retry logic)
          const requeue = (error as any).requeue !== false;
          this.channel.nack(msg, false, requeue);
        }
      },
      {
        noAck: false,
      },
    );

    this.subscribers.set(eventType, consumerTag.consumerTag);
    this.logger.log(
      `Subscribed to event ${eventType} on queue ${queue} (exchange: ${exchange}, routingKey: ${routingKey})`,
    );
  }

  async unsubscribe(eventType: string, handler: Function): Promise<void> {
    const consumerTag = this.subscribers.get(eventType);
    if (consumerTag && this.channel) {
      await this.channel.cancel(consumerTag);
      this.subscribers.delete(eventType);
      this.logger.log(`Unsubscribed from event ${eventType}`);
    }
  }
}
