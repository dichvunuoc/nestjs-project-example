import { CreateProductHandler } from './create-product.handler';
import { UpdateProductHandler } from './update-product.handler';
import { DeleteProductHandler } from './delete-product.handler';
import { IncreaseStockHandler } from './increase-stock.handler';
import { DecreaseStockHandler } from './decrease-stock.handler';
import { BulkStockAdjustmentHandler } from './bulk-stock-adjustment.handler';

export const CommandHandlers = [
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  IncreaseStockHandler,
  DecreaseStockHandler,
  BulkStockAdjustmentHandler,
];

export * from './create-product.handler';
export * from './update-product.handler';
export * from './delete-product.handler';
export * from './increase-stock.handler';
export * from './decrease-stock.handler';
export * from './bulk-stock-adjustment.handler';
