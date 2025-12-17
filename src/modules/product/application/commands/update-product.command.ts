import { ICommand } from '@core/application';

/**
 * Update Product Command
 */
export class UpdateProductCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly priceAmount: number,
    public readonly priceCurrency: string,
    public readonly stock: number,
    public readonly category: string,
  ) {}
}
