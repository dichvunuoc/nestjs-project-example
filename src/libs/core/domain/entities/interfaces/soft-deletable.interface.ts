/**
 * Soft Deletable interface
 * All domain entities that can be soft deleted should implement this interface
 */
export interface ISoftDeletable {
  deletedAt?: Date | null;
  isDeleted: boolean;
  delete(): void;
  restore(): void;
}
