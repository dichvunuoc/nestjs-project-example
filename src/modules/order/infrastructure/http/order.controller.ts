import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Inject,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { ICommandBus, IQueryBus } from 'src/libs/core/application';
import { COMMAND_BUS_TOKEN, QUERY_BUS_TOKEN } from 'src/libs/core/constants';
import {
  PlaceOrderCommand,
  CancelOrderCommand,
} from '../../application/commands';
import {
  GetOrderQuery,
  GetOrderListQuery,
  type OrderReadModel,
} from '../../application/queries';
import { PlaceOrderDto, CancelOrderDto } from '../../application/dtos';
import { OrderStatusEnum } from '../../domain';

/**
 * Order Controller
 *
 * HTTP endpoints for order management.
 *
 * Demonstrates:
 * - CQRS pattern (Command/Query separation)
 * - UnitOfWork for multi-aggregate transactions
 * - Saga-like compensation (cancel order)
 * - Read model queries with pagination
 */
@Controller('orders')
export class OrderController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN)
    private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN)
    private readonly queryBus: IQueryBus,
  ) {}

  /**
   * Place a new order
   *
   * This endpoint demonstrates IUnitOfWork pattern:
   * - Creates Order aggregate
   * - Decreases stock for all Product aggregates
   * - All within a single transaction
   *
   * @param dto Order details
   * @returns Created order ID
   */
  @Post()
  async placeOrder(@Body() dto: PlaceOrderDto): Promise<{ orderId: string }> {
    const command = new PlaceOrderCommand(
      dto.customerId,
      dto.items,
      dto.shippingAddress,
    );

    const orderId = await this.commandBus.execute(command);
    return { orderId };
  }

  /**
   * Cancel an order
   *
   * This endpoint demonstrates Saga-like compensation:
   * - Validates order can be cancelled
   * - Restores stock for all items (compensating action)
   * - Updates order status to CANCELLED
   * - All within a single transaction
   *
   * @param id Order ID
   * @param dto Cancel details (reason)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<void> {
    const command = new CancelOrderCommand(id, dto.reason, dto.cancelledBy);
    await this.commandBus.execute(command);
  }

  /**
   * Get order by ID (via QueryBus)
   *
   * Uses GetOrderQuery for CQRS read side.
   */
  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<OrderReadModel | null> {
    const query = new GetOrderQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * Get orders with filters and pagination
   *
   * Uses GetOrderListQuery for CQRS read side.
   */
  @Get()
  async getOrders(
    @Query('customerId') customerId?: string,
    @Query('status') status?: OrderStatusEnum,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const query = new GetOrderListQuery(
      { customerId, status },
      Number(page),
      Number(limit),
    );
    return this.queryBus.execute(query);
  }
}
