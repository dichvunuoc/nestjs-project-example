/**
 * Base Entity interface
 * All domain entities should implement this interface
 */
export interface IEntity {
  readonly id: string;
  readonly createdAt: Date;
  updatedAt: Date; // Not readonly để có thể update khi modify
  equals(object?: IEntity): boolean;
}
