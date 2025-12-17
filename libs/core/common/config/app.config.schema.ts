import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Application Configuration Schema
 * 
 * Validates application-level configuration
 */
export class AppConfigSchema {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  APP_NAME: string = 'nestjs-project-example';

  @IsString()
  @IsOptional()
  APP_VERSION: string = '1.0.0';

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  ENABLE_SWAGGER: boolean = false;

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsString()
  @IsOptional()
  TIMEZONE: string = 'UTC';
}
