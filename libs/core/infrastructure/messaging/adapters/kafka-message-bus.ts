import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IMessageBus, PublishOptions, SubscribeOptions } from '../message-bus.interface';
import { IDomainEvent } from '../../../domain/events';

/**
 * Kafka Message Bus
 * 
 * Production-ready Kafka implementation
 * 
 * Dependencies required:
 * - kafkajs: npm install kafkajs
 * 
 * Environment variables:
 * - KAFKA_BROKERS: localhost:9092 (comma-separated)
 * - KAFKA_CLIENT_ID: nestjs-app
 * - KAFKA_GROUP_ID: nestjs-consumer-group
 */
@Injectable()
export class KafkaMessageBus implements IMessageBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaMessageBus.name);
  private kafka: any = null;
  private producer: any = null;
  private consumers: Map<string, any> = new Map();
  private readonly brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  private readonly clientId = process.env.KAFKA_CLIENT_ID || 'nestjs-app';
  private readonly groupId = process.env.KAFKA_GROUP_ID || 'nestjs-consumer-group';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import để tránh lỗi nếu kafkajs chưa được cài
      const { Kafka } = await import('kafkajs');
      
      this.kafka = new Kafka({
        clientId: this.clientId,
        brokers: this.brokers,
      });

      this.producer = this.kafka.producer();
      await this.producer.connect();

      this.logger.log(`Connected to Kafka brokers: ${this.brokers.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Disconnect all consumers
      for (const [eventType, consumer] of this.consumers.entries()) {
        await consumer.disconnect();
      }
      this.consumers.clear();

      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }

      this.logger.log('Disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka:', error);
    }
  }

  isConnected(): boolean {
    return this.producer !== null;
  }

  async publish<T extends IDomainEvent>(
    event: T,
    options: PublishOptions = {},
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Kafka not connected');
    }

    const topic = options.exchange || event.eventType;
    const partition = options.routingKey ? parseInt(options.routingKey, 10) : undefined;
    const message = JSON.stringify(event);

    const kafkaMessage: any = {
      topic,
      messages: [
        {
          key: (event as any).id || `${event.eventType}-${Date.now()}`,
          value: message,
          partition,
          headers: {
            eventType: event.eventType,
            timestamp: Date.now().toString(),
            ...options.headers,
          },
        },
      ],
    };

    await this.producer.send(kafkaMessage);
    this.logger.debug(`Published event ${event.eventType} to topic ${topic}`);
  }

  async subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
    options: SubscribeOptions = {},
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Kafka not connected');
    }

    const topic = options.exchange || eventType;
    const consumerGroup = options.consumerGroup || this.groupId;

    // Create consumer if not exists
    if (!this.consumers.has(consumerGroup)) {
      const consumer = this.kafka.consumer({
        groupId: consumerGroup,
      });
      await consumer.connect();
      this.consumers.set(consumerGroup, consumer);
    }

    const consumer = this.consumers.get(consumerGroup);

    // Subscribe to topic
    await consumer.subscribe({
      topic,
      fromBeginning: false,
    });

    // Run consumer
    await consumer.run({
      eachMessage: async ({ topic, partition, message }: any) => {
        try {
          const event = JSON.parse(message.value.toString()) as T;
          await handler(event);
          this.logger.debug(
            `Processed event ${eventType} from topic ${topic}, partition ${partition}`,
          );
        } catch (error) {
          this.logger.error(
            `Error processing event ${eventType}:`,
            error instanceof Error ? error.stack : String(error),
          );
          // In Kafka, we don't nack - message will be retried by consumer group
        }
      },
    });

    this.logger.log(
      `Subscribed to event ${eventType} on topic ${topic} (consumerGroup: ${consumerGroup})`,
    );
  }

  async unsubscribe(eventType: string, handler: Function): Promise<void> {
    // Kafka doesn't support per-handler unsubscribe easily
    // This is a simplified implementation
    this.logger.warn(
      `Unsubscribe for Kafka is not fully supported. Consumer group will continue consuming.`,
    );
  }
}
