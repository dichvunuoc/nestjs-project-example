import { Injectable } from '@nestjs/common';
import { CommandBus as CqrsCommandBus } from '@nestjs/cqrs';
import { ICommand, ICommandBus } from 'src/libs/core/application';

/**
 * NestJS Command Bus implementation (Infrastructure Layer)
 * Implements ICommandBus interface from Application layer
 * Uses @nestjs/cqrs CommandBus for handler resolution and execution
 */
@Injectable()
export class NestCommandBus implements ICommandBus {
  constructor(private readonly cqrsCommandBus: CqrsCommandBus) {}

  /**
   * Execute command
   */
  async execute<T extends ICommand, R = any>(command: T): Promise<R> {
    return this.cqrsCommandBus.execute(command);
  }
}
