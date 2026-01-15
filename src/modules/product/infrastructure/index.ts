import { ProductCreatedAuditHandler } from './audit';
import { ProductReadModelProjection } from './projections';

export const EventHandlers = [
  ProductReadModelProjection,
  ProductCreatedAuditHandler,
];

export * from './persistence';
export * from './http';
export * from './projections';
export * from './audit';
