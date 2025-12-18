import { ICommand } from '@core/application';

/**
 * Increase Product Stock Command
 */
export class IncreaseStockCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly quantity: number,
  ) {}
}



