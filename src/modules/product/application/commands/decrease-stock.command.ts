import { ICommand } from 'src/libs/core/application';

/**
 * Decrease Product Stock Command
 */
export class DecreaseStockCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly quantity: number,
  ) {}
}
