import { IsString, IsNumber, IsOptional, IsBoolean, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Database Configuration Schema
 */
export class DatabaseConfigSchema {
  @IsString()
  @ValidateIf((o) => !o.DATABASE_URL)
  DATABASE_HOST: string;

  @IsNumber()
  @Type(() => Number)
  @ValidateIf((o) => !o.DATABASE_URL)
  DATABASE_PORT: number;

  @IsString()
  @ValidateIf((o) => !o.DATABASE_URL)
  DATABASE_USER: string;

  @IsString()
  @ValidateIf((o) => !o.DATABASE_URL)
  DATABASE_PASSWORD: string;

  @IsString()
  @ValidateIf((o) => !o.DATABASE_URL)
  DATABASE_NAME: string;

  @IsString()
  @IsOptional()
  DATABASE_URL: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  DATABASE_POOL_MIN: number = 2;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  DATABASE_POOL_MAX: number = 10;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  DATABASE_CONNECTION_TIMEOUT: number = 5000;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  DATABASE_SSL: boolean = false;
}
