import { Global, Module, DynamicModule } from '@nestjs/common';
import { MessageBusService } from './message-bus.service';
import { InMemoryMessageBus } from './adapters/in-memory-message-bus';
import { IMessageBus } from './message-bus.interface';

/**
 * Messaging Module
 * 
 * Provides message bus abstraction cho RabbitMQ/Kafka/In-Memory
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [MessagingModule],
 * })
 * export class AppModule {}
 * 
 * // Or with custom bus:
 * @Module({
 *   imports: [
 *     MessagingModule.forRoot({
 *       useClass: RabbitMQMessageBus,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [
    MessageBusService,
    InMemoryMessageBus,
  ],
  exports: [MessageBusService],
})
export class MessagingModule {
  /**
   * Register custom message bus
   */
  static forRoot(options: { useClass: new (...args: any[]) => IMessageBus }): DynamicModule {
    return {
      module: MessagingModule,
      providers: [
        {
          provide: 'MESSAGE_BUS',
          useClass: options.useClass,
        },
        MessageBusService,
      ],
      exports: [MessageBusService],
    };
  }
}
