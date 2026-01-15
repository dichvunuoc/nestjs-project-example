import { GetProductHandler } from './get-product.handler';
import { GetProductListHandler } from './get-product-list.handler';

export const QueryHandlers = [GetProductHandler, GetProductListHandler];

export * from './get-product.handler';
export * from './get-product-list.handler';
