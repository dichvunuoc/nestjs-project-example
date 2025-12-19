import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { ProductController } from './infrastructure/http';
import { ProductRepository } from './infrastructure/persistence/write';
import { ProductReadDao } from './infrastructure/persistence/read';
import { ProductUniquenessChecker } from './infrastructure/persistence';
import {
  PRODUCT_REPOSITORY_TOKEN,
  PRODUCT_READ_DAO_TOKEN,
  PRODUCT_UNIQUENESS_CHECKER_TOKEN,
} from './constants/tokens';
import { ProductReadModelProjection } from './infrastructure/projections';
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

/**
 * Product Module
 *
 * Feature module implementing DDD/CQRS pattern.
 *
 * Architecture:
 * - Domain: Entities, Value Objects, Domain Events, Domain Services
 * - Application: Commands, Queries, Handlers, DTOs
 * - Infrastructure: Repository, Read DAO, Controller
 *
 * Dependency Injection:
 * - Interfaces (Ports) are bound to Implementations (Adapters)
 * - Domain Services use injected Ports for infrastructure access
 */
@Module({
  imports: [SharedCqrsModule],
  controllers: [ProductController],
  providers: [
    // =================================================================
    // Write Side (Command)
    // =================================================================

    // Repository Implementation (Adapter)
    ProductRepository,
    {
      provide: PRODUCT_REPOSITORY_TOKEN,
      useExisting: ProductRepository,
    },

    // Domain Service Infrastructure (Uniqueness Checker)
    ProductUniquenessChecker,
    {
      provide: PRODUCT_UNIQUENESS_CHECKER_TOKEN,
      useExisting: ProductUniquenessChecker,
    },

    // Command Handlers
    CreateProductHandler,
    UpdateProductHandler,
    DeleteProductHandler,
    IncreaseStockHandler,
    DecreaseStockHandler,
    BulkStockAdjustmentHandler,

    // =================================================================
    // Read Side (Query)
    // =================================================================

    // Read DAO Implementation (Adapter)
    ProductReadDao,
    {
      provide: PRODUCT_READ_DAO_TOKEN,
      useExisting: ProductReadDao,
    },

    // Query Handlers
    GetProductHandler,
    GetProductListHandler,

    // =================================================================
    // Event Handlers (Projections)
    // =================================================================

    // Projection để sync Read Model khi có Domain Events
    ProductReadModelProjection,
  ],
  exports: [
    PRODUCT_REPOSITORY_TOKEN,
    PRODUCT_READ_DAO_TOKEN,
    PRODUCT_UNIQUENESS_CHECKER_TOKEN,
  ],
})
export class ProductModule {}
