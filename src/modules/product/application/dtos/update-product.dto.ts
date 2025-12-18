/**
 * DTO for updating a product
 */
export class UpdateProductDto {
  name?: string;
  description?: string;
  priceAmount?: number;
  priceCurrency?: string;
  stock?: number;
  category?: string;
}
