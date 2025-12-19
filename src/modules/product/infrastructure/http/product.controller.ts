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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  type ICommandBus,
  type IQueryBus,
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from 'src/libs/core';
import { PRODUCT_READ_DAO_TOKEN } from '../../constants/tokens';
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
  ProductSearchDto,
  ProductStatisticsDto,
} from '../../application/dtos';
import type { IProductReadDao } from '../../application/queries/ports';

/**
 * Product HTTP Controller
 *
 * Presentation layer - handles HTTP requests
 * Delegates to Command/Query buses (CQRS pattern)
 *
 * ## CQRS Pattern
 * - Write operations (POST, PUT, DELETE) → Command Bus
 * - Read operations (GET) → Query Bus or Read DAO
 */
@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
    @Inject(PRODUCT_READ_DAO_TOKEN)
    private readonly productReadDao: IProductReadDao,
  ) {}

  // =========================================================================
  // WRITE OPERATIONS (Commands)
  // =========================================================================

  /**
   * Create a new product
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create product',
    description: 'Creates a new product and emits ProductCreatedEvent',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Product name already exists' })
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
   * Update product information
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update product',
    description: 'Updates product information and emits ProductUpdatedEvent',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Concurrent modification detected' })
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
   * Soft delete a product
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete product',
    description: 'Soft deletes a product and emits ProductDeletedEvent',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(@Param('id') id: string): Promise<void> {
    const command = new DeleteProductCommand(id);
    await this.commandBus.execute(command);
  }

  /**
   * Increase product stock
   */
  @Post(':id/stock/increase')
  @ApiOperation({
    summary: 'Increase stock',
    description: 'Increases product stock and emits StockIncreasedEvent',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', minimum: 1, example: 10 },
        reason: { type: 'string', example: 'Restock from supplier' },
      },
      required: ['quantity'],
    },
  })
  @ApiResponse({ status: 200, description: 'Stock increased successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async increaseStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; reason?: string },
  ): Promise<void> {
    const command = new IncreaseStockCommand(id, body.quantity);
    await this.commandBus.execute(command);
  }

  /**
   * Decrease product stock
   */
  @Post(':id/stock/decrease')
  @ApiOperation({
    summary: 'Decrease stock',
    description:
      'Decreases product stock and emits StockDecreasedEvent. Includes low stock and out of stock flags.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', minimum: 1, example: 5 },
        reason: { type: 'string', example: 'Order fulfillment' },
      },
      required: ['quantity'],
    },
  })
  @ApiResponse({ status: 200, description: 'Stock decreased successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async decreaseStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; reason?: string },
  ): Promise<void> {
    const command = new DecreaseStockCommand(id, body.quantity);
    await this.commandBus.execute(command);
  }

  /**
   * Bulk stock adjustment
   */
  @Post('stock/bulk-adjust')
  @ApiOperation({
    summary: 'Bulk stock adjustment',
    description:
      'Adjusts stock for multiple products in a single operation. Supports partial success.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk adjustment completed',
    schema: {
      type: 'object',
      properties: {
        totalRequested: { type: 'number' },
        successful: { type: 'number' },
        failed: { type: 'number' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              success: { type: 'boolean' },
              previousStock: { type: 'number' },
              newStock: { type: 'number' },
              quantity: { type: 'number' },
              error: { type: 'string' },
              warning: { type: 'string' },
            },
          },
        },
        warnings: { type: 'array', items: { type: 'string' } },
      },
    },
  })
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

  // =========================================================================
  // READ OPERATIONS (Queries)
  // =========================================================================

  /**
   * Get product by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieves a single product by its ID. Uses caching.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product found', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getById(@Param('id') id: string): Promise<ProductDto> {
    const query = new GetProductQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * Get product list with basic pagination
   */
  @Get()
  @ApiOperation({
    summary: 'List products',
    description:
      'Retrieves a paginated list of products with optional category filter and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product list',
    type: [ProductDto],
  })
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
   * Advanced product search
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Advanced product search',
    description: `
Search products with multiple filters:
- Name (partial match)
- Category (exact match)
- Price range (min/max)
- Low stock threshold
- Sorting and pagination
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [ProductDto],
  })
  async search(@Body() criteria: ProductSearchDto): Promise<ProductDto[]> {
    return this.productReadDao.search(criteria);
  }

  /**
   * Get product statistics
   */
  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get product statistics',
    description: `
Returns aggregated product statistics:
- Total products count
- Total inventory value
- Average price
- Low stock count
- Out of stock count
- Category breakdown
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Product statistics',
    type: ProductStatisticsDto,
  })
  async getStatistics(
    @Query('lowStockThreshold') lowStockThreshold?: string,
  ): Promise<ProductStatisticsDto> {
    const threshold = lowStockThreshold ? parseInt(lowStockThreshold) : 10;
    return this.productReadDao.getStatistics(threshold);
  }

  /**
   * Get low stock products
   */
  @Get('inventory/low-stock')
  @ApiOperation({
    summary: 'Get low stock products',
    description:
      'Returns products with stock below the specified threshold (excluding out of stock).',
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock products',
    type: [ProductDto],
  })
  async getLowStock(
    @Query('threshold') threshold?: string,
  ): Promise<ProductDto[]> {
    const stockThreshold = threshold ? parseInt(threshold) : 10;
    return this.productReadDao.findLowStock(stockThreshold);
  }
}
