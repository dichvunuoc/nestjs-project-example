import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Redis Configuration Schema
 */
export class RedisConfigSchema {
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  REDIS_DB: number = 0;

  @IsString()
  @IsOptional()
  REDIS_URL: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  REDIS_CONNECT_TIMEOUT: number = 10000;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  REDIS_RETRY_DELAY: number = 1000;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  REDIS_MAX_RETRIES: number = 3;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  REDIS_ENABLE_READY_CHECK: boolean = true;
}
