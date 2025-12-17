/**
 * Command Handler decorator
 * Re-export từ @nestjs/cqrs để sử dụng với NestJS CQRS library
 *
 * Infrastructure layer CAN depend on framework - this is correct architecture
 *
 * Usage:
 * @CommandHandler(CreateUserCommand)
 * export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
 *   async execute(command: CreateUserCommand): Promise<void> {
 *     // Handle command
 *   }
 * }
 *
 * Handlers are automatically registered by @nestjs/cqrs when decorated với @CommandHandler
 */
export { CommandHandler } from '@nestjs/cqrs';
