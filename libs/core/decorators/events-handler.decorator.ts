/**
 * Events Handler decorator
 * Re-export từ @nestjs/cqrs để sử dụng với NestJS CQRS library
 *
 * Infrastructure layer CAN depend on framework - this is correct architecture
 *
 * Usage:
 * @EventsHandler(UserCreatedEvent, UserUpdatedEvent)
 * export class UserProjection {
 *   async handle(event: UserCreatedEvent | UserUpdatedEvent): Promise<void> {
 *     // Handle event
 *   }
 * }
 *
 * Handlers are automatically registered by @nestjs/cqrs when decorated với @EventsHandler
 */
export { EventsHandler } from '@nestjs/cqrs';
