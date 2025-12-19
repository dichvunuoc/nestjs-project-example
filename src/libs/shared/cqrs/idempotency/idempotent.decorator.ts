import { Inject } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import type {
  IIdempotentCommand,
  IdempotencyOptions,
} from 'src/libs/core/application';

/**
 * Idempotent Decorator
 *
 * Marks a command handler method as idempotent.
 * When applied, duplicate commands with the same idempotencyKey
 * will return the cached result instead of re-executing.
 *
 * Requirements:
 * - Command must implement IIdempotentCommand
 * - Handler class must have IdempotencyService injected
 * - Cache service should be available for persistent storage
 *
 * @param options - Idempotency configuration options
 *
 * @example
 * ```typescript
 * @CommandHandler(CreateOrderCommand)
 * export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, string> {
 *   constructor(
 *     private readonly idempotencyService: IdempotencyService,
 *     // ... other dependencies
 *   ) {}
 *
 *   @Idempotent({ ttlSeconds: 3600 })
 *   async execute(command: CreateOrderCommand): Promise<string> {
 *     // This logic only runs once per idempotencyKey
 *     const order = await this.createOrder(command);
 *     return order.id;
 *   }
 * }
 * ```
 */
export function Idempotent(options?: IdempotencyOptions): MethodDecorator {
  return function (
    target: Record<string, unknown>,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: { idempotencyService?: IdempotencyService },
      command: IIdempotentCommand,
      ...args: unknown[]
    ): Promise<unknown> {
      // Validate idempotency service is available
      const idempotencyService = this.idempotencyService;
      if (!idempotencyService) {
        // If no idempotency service, just execute normally
        console.warn(
          `@Idempotent decorator used but IdempotencyService not injected in ${(target.constructor as { name?: string }).name}`,
        );
        return (await originalMethod.call(this, command, ...args)) as unknown;
      }

      // Validate command has idempotencyKey
      if (!command.idempotencyKey) {
        // No idempotency key provided, execute normally
        return (await originalMethod.call(this, command, ...args)) as unknown;
      }

      // Check for existing result
      const existing = await idempotencyService.getExisting(
        command.idempotencyKey,
        options,
      );

      if (existing) {
        if (options?.returnCachedResult !== false) {
          // Return cached result
          return existing.result;
        } else {
          // Throw error for duplicate
          throw new Error(
            `Duplicate command detected: ${command.idempotencyKey}`,
          );
        }
      }

      // Execute the original method
      const result = (await originalMethod.call(
        this,
        command,
        ...args,
      )) as unknown;

      // Store the result for future duplicate detection
      await idempotencyService.store(
        command.idempotencyKey,
        result,
        command.constructor.name,
        options,
      );

      return result;
    };

    return descriptor;
  };
}

/**
 * Helper decorator to inject IdempotencyService
 *
 * Use this on the class property to inject the service:
 *
 * @example
 * ```typescript
 * @CommandHandler(CreateOrderCommand)
 * export class CreateOrderHandler {
 *   @InjectIdempotencyService()
 *   private readonly idempotencyService: IdempotencyService;
 * }
 * ```
 */
export function InjectIdempotencyService(): PropertyDecorator {
  return Inject(IdempotencyService);
}
