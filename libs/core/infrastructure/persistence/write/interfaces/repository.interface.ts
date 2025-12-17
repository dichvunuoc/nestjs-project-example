import { BaseEntity } from '../../../../domain/entities';

/**
 * Repository interface
 * Abstract data access layer với standard CRUD methods
 */
export interface IRepository<T extends BaseEntity> {
  create(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
