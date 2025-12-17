import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  type ICommandBus,
  type IQueryBus,
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from '@core';
import {
  CreateProductCommand,
  UpdateProductCommand,
  DeleteProductCommand,
  IncreaseStockCommand,
  DecreaseStockCommand,
  BulkStockAdjustmentCommand,
  GetProductQuery,
  GetProductListQuery,
} from '../../application';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductDto,
  BulkStockAdjustmentDto,
} from '../../application/dtos';

/**
 * Product HTTP Controller
 *
 * Presentation layer - handles HTTP requests
 * Delegates to Command/Query buses (CQRS pattern)
 */
@Controller('products')
export class ProductController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  /**
   * Create product
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto): Promise<{ id: string }> {
    const command = new CreateProductCommand(
      dto.name,
      dto.description,
      dto.priceAmount,
      dto.priceCurrency || 'USD',
      dto.stock,
      dto.category,
    );

    const id = await this.commandBus.execute<CreateProductCommand, string>(
      command,
    );
    return { id };
  }

  /**
   * Get product by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<ProductDto> {
    const query = new GetProductQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * Get product list
   */
  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<ProductDto[]> {
    const query = new GetProductListQuery(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      category,
      search,
    );
    return this.queryBus.execute(query);
  }

  /**
   * Update product
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<void> {
    const command = new UpdateProductCommand(
      id,
      dto.name || '',
      dto.description || '',
      dto.priceAmount || 0,
      dto.priceCurrency || 'USD',
      dto.stock || 0,
      dto.category || '',
    );

    await this.commandBus.execute(command);
  }

  /**
   * Delete product
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    const command = new DeleteProductCommand(id);
    await this.commandBus.execute(command);
  }

  /**
   * Increase stock
   */
  @Post(':id/stock/increase')
  async increaseStock(
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ): Promise<void> {
    const command = new IncreaseStockCommand(id, body.quantity);
    await this.commandBus.execute(command);
  }

  /**
   * Decrease stock
   */
  @Post(':id/stock/decrease')
  async decreaseStock(
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ): Promise<void> {
    const command = new DecreaseStockCommand(id, body.quantity);
    await this.commandBus.execute(command);
  }

  /**
   * Bulk stock adjustment
   *
   * Complex business logic example:
   * - Adjusts stock for multiple products in a single operation
   * - Validates business rules (max/min stock limits)
   * - Handles partial failures with detailed reporting
   * - Supports transaction-like behavior
   *
   * Example request:
   * {
   *   "adjustments": [
   *     { "productId": "id1", "quantity": 10, "reason": "Restock" },
   *     { "productId": "id2", "quantity": -5, "reason": "Damaged" }
   *   ],
   *   "options": {
   *     "maxStockLimit": 1000,
   *     "minStockThreshold": 10,
   *     "allowPartialSuccess": true,
   *     "batchReference": "BATCH-2024-001"
   *   }
   * }
   */
  @Post('stock/bulk-adjust')
  async bulkStockAdjustment(@Body() dto: BulkStockAdjustmentDto): Promise<{
    totalRequested: number;
    successful: number;
    failed: number;
    results: Array<{
      productId: string;
      success: boolean;
      previousStock: number;
      newStock: number;
      quantity: number;
      error?: string;
      warning?: string;
    }>;
    warnings: string[];
  }> {
    const command = new BulkStockAdjustmentCommand(
      dto.adjustments,
      dto.options,
    );
    return this.commandBus.execute(command);
  }
}
