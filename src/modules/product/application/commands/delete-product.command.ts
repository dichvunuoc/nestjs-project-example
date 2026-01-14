import { ICommand } from 'src/libs/core/application';

/**
 * Delete Product Command
 */
export class DeleteProductCommand implements ICommand {
  constructor(public readonly id: string) {}
}





