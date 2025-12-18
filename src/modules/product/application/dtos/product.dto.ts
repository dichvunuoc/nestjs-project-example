/**
 * Product DTO for read operations
 * Used in Query responses
 */
export class ProductDto {
  id: string;
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  stock: number;
  category: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    name: string,
    description: string,
    priceAmount: number,
    priceCurrency: string,
    stock: number,
    category: string,
    version: number,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = {
      amount: priceAmount,
      currency: priceCurrency,
    };
    this.stock = stock;
    this.category = category;
    this.version = version;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
