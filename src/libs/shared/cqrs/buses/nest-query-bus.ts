import { Injectable } from '@nestjs/common';
import { QueryBus as CqrsQueryBus } from '@nestjs/cqrs';
import { IQuery, IQueryBus } from 'src/libs/core/application';

/**
 * NestJS Query Bus implementation (Infrastructure Layer)
 * Implements IQueryBus interface from Application layer
 * Uses @nestjs/cqrs QueryBus for handler resolution and execution
 *
 * This is an Adapter (Infrastructure) that implements the Port (Application Interface)
 * Infrastructure layer CAN depend on framework - this is correct architecture
 */
@Injectable()
export class NestQueryBus implements IQueryBus {
  constructor(private readonly cqrsQueryBus: CqrsQueryBus) {}

  async execute<TResult>(query: IQuery<TResult>): Promise<TResult> {
    return this.cqrsQueryBus.execute(query as any);
  }
}
