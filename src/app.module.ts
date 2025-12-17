import { Global, Module } from '@nestjs/common';
import { CoreModule } from '../libs/core';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from '../libs/core/common/health';
import { ProductModule } from './modules/product/product.module';

@Global()
@Module({
  imports: [
    CoreModule, // DDD/CQRS Core Module - Global module
    DatabaseModule, // Drizzle Database
    HealthModule, // Health check endpoints
    ProductModule, // Product Feature Module (DDD/CQRS Example)
  ],
})
export class AppModule {}
