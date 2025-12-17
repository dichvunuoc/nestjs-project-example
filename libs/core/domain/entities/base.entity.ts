import { IEntity } from './interfaces/entity.interface';

/**
 * Base Entity class
 * Provides common properties (id, createdAt, updatedAt)
 *
 * Note: Domain events logic is NOT here - only AggregateRoot can emit events.
 * Entity children (e.g., OrderItem) are internal parts and cannot communicate directly with outside world.
 */
export abstract class BaseEntity implements IEntity {
  public readonly id: string;
  public readonly createdAt: Date;
  public updatedAt: Date; // Not readonly để có thể update khi modify

  /**
   * Constructor cho phép truyền props vào để phục vụ Reconstitution từ DB
   * @param id Entity ID
   * @param createdAt Optional - Nếu không truyền (tạo mới) thì lấy thời điểm hiện tại
   * @param updatedAt Optional - Nếu không truyền (tạo mới) thì lấy thời điểm hiện tại
   */
  protected constructor(id: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id;
    this.createdAt = createdAt || new Date(); // Nếu ko truyền (tạo mới) thì lấy now
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Logic so sánh quan trọng trong DDD
   * Hai Entity được coi là bằng nhau nếu ID của chúng giống nhau
   * (dù các thuộc tính khác có thể khác)
   *
   * @param object Entity khác để so sánh
   * @returns true nếu cùng ID, false nếu khác
   */
  public equals(object?: BaseEntity): boolean {
    if (object == null || object == undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!(object instanceof BaseEntity)) {
      return false;
    }
    return this.id === object.id;
  }
}
