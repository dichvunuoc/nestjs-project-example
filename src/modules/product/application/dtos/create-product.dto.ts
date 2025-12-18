/**
 * DTO for creating a product
 */
export class CreateProductDto {
  name: string;
  description: string;
  priceAmount: number;
  priceCurrency?: string;
  stock: number;
  category: string;
}
