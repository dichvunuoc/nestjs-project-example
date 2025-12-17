import { IRepository } from './interfaces/repository.interface';
import { BaseEntity } from '../../../domain/entities';

/**
 * Base Repository abstract class
 * Provides common repository methods implementation
 */
export abstract class BaseRepository<
  T extends BaseEntity,
> implements IRepository<T> {
  abstract create(entity: T): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract update(id: string, entity: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
