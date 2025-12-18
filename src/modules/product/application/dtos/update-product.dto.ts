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
 * DTO for updating a product
 *
 * All fields are optional - only provided fields will be updated.
 * Validated using class-validator decorators.
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Product name cannot be empty if provided' })
  @MaxLength(200, { message: 'Product name cannot exceed 200 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Price amount must be a number' })
  @IsPositive({ message: 'Price amount must be positive' })
  priceAmount?: number;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Currency code must be 3 characters' })
  @MaxLength(3, { message: 'Currency code must be 3 characters' })
  priceCurrency?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Stock must be a number' })
  @Min(0, { message: 'Stock cannot be negative' })
  stock?: number;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Category cannot be empty if provided' })
  @MaxLength(100, { message: 'Category cannot exceed 100 characters' })
  category?: string;
}
