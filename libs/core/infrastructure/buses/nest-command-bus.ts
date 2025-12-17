import { Injectable } from '@nestjs/common';
import { CommandBus as CqrsCommandBus } from '@nestjs/cqrs';
import { ICommand } from '../../application/commands/interfaces/command.interface';
import { ICommandBus } from '../../application/commands/interfaces/command-bus.interface';

@Injectable()
export class NestCommandBus implements ICommandBus {
  constructor(private readonly cqrsCommandBus: CqrsCommandBus) {}

  /**
   * Execute command
   * @template T Command Type
   * @template R Result Type (Mặc định là any, nhưng nên là void hoặc string/number ID)
   */
  async execute<T extends ICommand, R = any>(command: T): Promise<R> {
    // Không cần truyền generic <T> vào execute cũng được, TS tự suy luận
    return this.cqrsCommandBus.execute(command) as Promise<R>;
  }
}
