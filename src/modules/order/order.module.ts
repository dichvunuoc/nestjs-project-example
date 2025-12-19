import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { ProductModule } from '../product/product.module';
import { OrderController } from './infrastructure/http';
import { OrderRepository } from './infrastructure/persistence/write';
import { OrderReadDao } from './infrastructure/persistence/read';
import { OrderReadModelProjection } from './infrastructure/projections';
import {
  ORDER_REPOSITORY_TOKEN,
  ORDER_READ_DAO_TOKEN,
} from './constants/tokens';
import {
  PlaceOrderHandler,
  CancelOrderHandler,
} from './application/commands/handlers';
import {
  GetOrderHandler,
  GetOrderListHandler,
} from './application/queries/handlers';

/**
 * Order Module
 *
 * Feature module demonstrating advanced DDD/CQRS patterns:
 *
 * ## Key Demonstrations:
 *
 * ### 1. IUnitOfWork Pattern
 * PlaceOrderHandler uses UnitOfWork to:
 * - Decrease stock in Product aggregates
 * - Create Order aggregate
 * - All within a single database transaction
 *
 * ### 2. Cross-Aggregate Transactions
 * Order placement involves:
 * - Product aggregate (stock modification)
 * - Order aggregate (creation)
 * Both are saved atomically.
 *
 * ### 3. Saga-like Compensation (CancelOrderHandler)
 * - Cancel order and restore stock
 * - Demonstrates compensating actions pattern
 * - All within UnitOfWork for atomicity
 *
 * ### 4. BusinessRuleException Usage
 * OrderValidationService validates:
 * - Minimum order value
 * - Maximum items per order
 * - Maximum quantity per item
 *
 * ### 5. Domain Events & Projections
 * - OrderPlacedEvent, OrderConfirmedEvent, OrderCancelledEvent
 * - OrderReadModelProjection handles events
 * - Cache invalidation on state changes
 *
 * ### 6. CQRS Read Side
 * - OrderReadDao: Read-optimized queries
 * - GetOrderQuery, GetOrderListQuery: Query handlers
 * - Pagination and filtering support
 *
 * ### 7. Rich Domain Model
 * - Order: Aggregate Root with status state machine
 * - OrderItem: Child entity (extends BaseEntity)
 * - Money, OrderId, OrderStatus: Value Objects
 *
 * ## Dependencies:
 * - ProductModule: Access to IProductRepository for stock operations
 * - SharedCqrsModule: Command/Query/Event buses
 */
@Module({
  imports: [
    SharedCqrsModule,
    ProductModule, // Import for IProductRepository access
  ],
  controllers: [OrderController],
  providers: [
    // Write Side - Repository Implementation
    OrderRepository,
    {
      provide: ORDER_REPOSITORY_TOKEN,
      useExisting: OrderRepository,
    },

    // Read Side - DAO Implementation
    OrderReadDao,
    {
      provide: ORDER_READ_DAO_TOKEN,
      useExisting: OrderReadDao,
    },

    // Command Handlers
    PlaceOrderHandler,
    CancelOrderHandler,

    // Query Handlers
    GetOrderHandler,
    GetOrderListHandler,

    // Projections (Event Handlers)
    OrderReadModelProjection,
  ],
  exports: [ORDER_REPOSITORY_TOKEN, ORDER_READ_DAO_TOKEN],
})
export class OrderModule {}
