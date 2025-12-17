import { ICommand } from '@core/application';

/**
 * Delete Product Command
 */
export class DeleteProductCommand implements ICommand {
  constructor(public readonly id: string) {}
}
