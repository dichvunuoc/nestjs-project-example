import { Injectable } from '@nestjs/common';
import { QueryBus as CqrsQueryBus } from '@nestjs/cqrs';
import { IQuery } from '../../application/queries/interfaces/query.interface';
import { IQueryBus } from '../../application/queries/interfaces/query-bus.interface';

/**
 * NestJS Query Bus implementation (Infrastructure Layer)
 * Implements IQueryBus interface từ Application layer
 * Uses @nestjs/cqrs QueryBus cho handler resolution và execution
 *
 * This is an Adapter (Infrastructure) that implements the Port (Application Interface)
 * Infrastructure layer CAN depend on framework - this is correct architecture
 *
 * Note: Type casting is needed because @nestjs/cqrs QueryBus uses different generic signature
 * but runtime behavior is compatible
 */
@Injectable()
export class NestQueryBus implements IQueryBus {
  constructor(private readonly cqrsQueryBus: CqrsQueryBus) {}

  async execute<TResult>(query: IQuery<TResult>): Promise<TResult> {
    // Type casting needed because @nestjs/cqrs QueryBus has different signature
    // but runtime behavior is compatible
    return this.cqrsQueryBus.execute(query as any);
  }
}
