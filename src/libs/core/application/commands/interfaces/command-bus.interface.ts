import { ICommand } from './command.interface';

/**
 * Command Bus interface
 * Mediator pattern cho CQRS command execution
 */
export interface ICommandBus {
  execute<T extends ICommand, R = any>(command: T): Promise<R>;
}
