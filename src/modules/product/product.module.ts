import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { LoggerModule } from '@core/common/logger';
import { MetricsModule } from '@core/common/metrics';
import { ResilienceModule } from '@core/infrastructure/resilience';
import { MessagingModule } from '@core/infrastructure/messaging';
import { HttpClientModule } from '@core/infrastructure/http';
import { TracingModule } from '@core/infrastructure/tracing';
import { ProductController } from './infrastructure/http';
import { ProductRepository } from './infrastructure/persistence/write';
import { ProductReadDao } from './infrastructure/persistence/read';
import {
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  IncreaseStockHandler,
  DecreaseStockHandler,
  BulkStockAdjustmentHandler,
} from './application/commands/handlers';
import {
  GetProductHandler,
  GetProductListHandler,
} from './application/queries/handlers';
import { IProductRepository } from './domain/repositories';
import { IProductReadDao } from './application/queries/ports';

/**
 * Product Module
 *
 * Feature module implementing DDD/CQRS pattern với Production-ready components
 *
 * Structure:
 * - Domain Layer: Entities, Value Objects, Domain Events, Repository Interfaces
 * - Application Layer: Commands, Queries, Handlers, DTOs
 * - Infrastructure Layer: Repository Implementation, Read DAO, HTTP Controllers
 *
 * Production Features:
 * - Structured Logging với Correlation ID
 * - Metrics Collection (Prometheus)
 * - Distributed Tracing (OpenTelemetry)
 * - Message Queue (Event Bus)
 * - HTTP Client với Retry/Circuit Breaker
 */
@Module({
  imports: [
    CoreModule, // CQRS buses
    LoggerModule, // Structured logging
    MetricsModule, // Prometheus metrics
    ResilienceModule, // Retry & Circuit Breaker
    MessagingModule, // Message Queue
    HttpClientModule, // HTTP Client
    TracingModule, // OpenTelemetry tracing
  ],
  controllers: [ProductController],
  providers: [
    // Repository Implementation (Adapter)
    ProductRepository,
    {
      provide: 'IProductRepository', // Provide interface token
      useExisting: ProductRepository, // Use implementation
    },
    // Read DAO
    ProductReadDao,
    {
      provide: 'IProductReadDao', // Provide interface token
      useExisting: ProductReadDao, // Use implementation
    },
    // Command Handlers
    CreateProductHandler,
    UpdateProductHandler,
    DeleteProductHandler,
    IncreaseStockHandler,
    DecreaseStockHandler,
    BulkStockAdjustmentHandler,
    // Query Handlers
    GetProductHandler,
    GetProductListHandler,
  ],
  exports: [
    // Export repository interface for other modules if needed
    'IProductRepository',
    'IProductReadDao',
  ],
})
export class ProductModule {}
