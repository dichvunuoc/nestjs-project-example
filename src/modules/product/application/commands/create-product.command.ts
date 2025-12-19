import { ICommand } from 'src/libs/core/application';

/**
 * Create Product Command
 * Commands represent write operations (mutations)
 */
export class CreateProductCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly priceAmount: number,
    public readonly priceCurrency: string,
    public readonly stock: number,
    public readonly category: string,
  ) {}
}
