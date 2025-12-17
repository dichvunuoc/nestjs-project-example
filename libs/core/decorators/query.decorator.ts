/**
 * Query Handler decorator
 * Re-export từ @nestjs/cqrs để sử dụng với NestJS CQRS library
 *
 * Infrastructure layer CAN depend on framework - this is correct architecture
 *
 * Usage:
 * @QueryHandler(GetUserQuery)
 * export class GetUserHandler implements IQueryHandler<GetUserQuery, User> {
 *   async execute(query: GetUserQuery): Promise<User> {
 *     // Handle query
 *   }
 * }
 *
 * Handlers are automatically registered by @nestjs/cqrs when decorated với @QueryHandler
 */
export { QueryHandler } from '@nestjs/cqrs';
