import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a product
 *
 * Validated using class-validator decorators.
 * Transform is enabled, so string numbers will be converted to numbers.
 */
export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'Product name is required' })
  @MaxLength(200, { message: 'Product name cannot exceed 200 characters' })
  name: string;

  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;

  @IsNumber({}, { message: 'Price amount must be a number' })
  @IsPositive({ message: 'Price amount must be positive' })
  priceAmount: number;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Currency code must be 3 characters' })
  @MaxLength(3, { message: 'Currency code must be 3 characters' })
  priceCurrency?: string;

  @IsNumber({}, { message: 'Stock must be a number' })
  @Min(0, { message: 'Stock cannot be negative' })
  stock: number;

  @IsString()
  @MinLength(1, { message: 'Category is required' })
  @MaxLength(100, { message: 'Category cannot exceed 100 characters' })
  category: string;
}





