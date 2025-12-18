import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from '../libs/core';
import { DatabaseModule } from './database/database.module';
import { HealthModule, LoggingModule } from '../libs/core/common';
import { ProductModule } from './modules/product/product.module';

@Global()
@Module({
  imports: [
    // Configuration (loads .env)
    ConfigModule.forRoot({ isGlobal: true }),
    // Structured Logging with Pino
    LoggingModule,
    // DDD/CQRS Core Module - Global module
    CoreModule,
    // Drizzle Database
    DatabaseModule,
    // Health check endpoints
    HealthModule,
    // Product Feature Module (DDD/CQRS Example)
    ProductModule,
  ],
})
export class AppModule {}
