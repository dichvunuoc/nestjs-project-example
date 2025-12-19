import { BaseEntity } from './base.entity';
import { IDomainEvent } from '../events';
import { IAggregateRoot } from './interfaces/aggregate-root.interface';

/**
 * Base Aggregate Root class (Pure TypeScript - No Framework Dependency)
 *
 * Aggregate Root là thành phần quan trọng nhất trong DDD để đảm bảo:
 * - Consistency boundary: Mọi thay đổi dữ liệu phải đi qua Aggregate Root
 * - Entry point: Là thực thể duy nhất mà bên ngoài có thể tương tác trực tiếp
 * - Domain events: CHỈ Aggregate Root mới được phép phát ra Domain Event
 *
 * Nguyên tắc DDD: Entity con (ví dụ: OrderItem) chỉ là bộ phận nội bộ,
 * không được giao tiếp trực tiếp với thế giới bên ngoài.
 * Nếu OrderItem thay đổi, nó phải báo cho Order (Root), và Order sẽ bắn event.
 *
 * Trong CQRS, Aggregate Root chỉ được sử dụng ở phía Write (Command Side)
 *
 * Note: This is a pure TypeScript implementation. For NestJS integration,
 * use the AggregateRootAdapter in infrastructure layer to extend @nestjs/cqrs AggregateRoot
 */
export abstract class AggregateRoot
  extends BaseEntity
  implements IAggregateRoot
{
  /**
   * Domain events - CHỈ Aggregate Root mới có
   * Entity con không được phép emit events trực tiếp
   */
  private _domainEvents: IDomainEvent[] = [];

  /**
   * Aggregate version cho optimistic concurrency control
   * Không readonly để ORM có thể map vào khi reconstitute từ DB
   */
  public version: number;

  /**
   * Constructor cho phép truyền props vào để phục vụ Reconstitution từ DB
   * @param id Aggregate ID
   * @param version Optional - Version cho optimistic concurrency control
   * @param createdAt Optional - Nếu không truyền (tạo mới) thì lấy thời điểm hiện tại
   * @param updatedAt Optional - Nếu không truyền (tạo mới) thì lấy thời điểm hiện tại
   */
  protected constructor(
    id: string,
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.version = version || 0;
  }

  // --- Event Management (Chỉ Root mới có) ---

  /**
   * Add domain event vào aggregate
   * Domain events sẽ được publish sau khi aggregate được save
   *
   * Events are frozen (immutable) để đảm bảo tính nhất quán
   *
   * @param event Domain event to add
   */
  protected addDomainEvent(event: IDomainEvent): void {
    // Freeze event để đảm bảo immutability
    // Ngăn chặn việc modify event sau khi đã add vào aggregate
    Object.freeze(event);
    this._domainEvents.push(event);
    this.markAsUpdated();
  }

  /**
   * Get all domain events từ aggregate
   * Returns deep copy để đảm bảo events không bị modify từ bên ngoài
   *
   * @returns Deep copy of domain events array
   */
  public getDomainEvents(): IDomainEvent[] {
    // Deep copy events để đảm bảo immutability
    return this._domainEvents.map((event) => {
      // Events đã được freeze khi add, nhưng vẫn copy để an toàn tuyệt đối
      return { ...event };
    });
  }

  /**
   * Clear all domain events sau khi đã publish
   */
  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // --- Helper Methods ---

  /**
   * Mark aggregate as updated
   * Tự động update updatedAt và tăng version
   *
   * Version được tăng tự động ở Domain Layer để đảm bảo consistency
   * Repository sẽ verify version này khi persist
   */
  private markAsUpdated(): void {
    this.updatedAt = new Date();
    // Tự động tăng version ở Domain Layer
    // Repository sẽ check version này khi persist để đảm bảo Optimistic Concurrency Control
    this.version++;
  }

  /**
   * Mark aggregate as modified (public method cho subclass override)
   * Có thể override để implement version increment logic
   */
  protected markAsModified(): void {
    this.markAsUpdated();
    // Version increment logic có thể được implement trong subclass
    // hoặc trong repository khi save
  }
}
