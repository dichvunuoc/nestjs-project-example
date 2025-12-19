/**
 * Product DTO for read operations
 *
 * Used in Query responses (Read Model).
 * Contains only data relevant for client consumption.
 *
 * Note: 'version' is intentionally excluded as it's an
 * internal implementation detail of the Write Model.
 */
export class ProductDto {
  /** Product ID */
  id: string;

  /** Product name */
  name: string;

  /** Product description */
  description: string;

  /** Price information */
  price: {
    amount: number;
    currency: string;
  };

  /** Current stock level */
  stock: number;

  /** Product category */
  category: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  constructor(
    id: string,
    name: string,
    description: string,
    priceAmount: number,
    priceCurrency: string,
    stock: number,
    category: string,
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
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Factory method to create from raw data
   */
  static fromRaw(data: {
    id: string;
    name: string;
    description: string;
    priceAmount: number;
    priceCurrency: string;
    stock: number;
    category: string;
    createdAt: Date;
    updatedAt: Date;
  }): ProductDto {
    return new ProductDto(
      data.id,
      data.name,
      data.description,
      data.priceAmount,
      data.priceCurrency,
      data.stock,
      data.category,
      data.createdAt,
      data.updatedAt,
    );
  }
}
