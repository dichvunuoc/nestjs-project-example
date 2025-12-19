/**
 * Request Context Interface
 *
 * Chứa thông tin context của request hiện tại
 * Được sử dụng cho:
 * - Correlation ID (distributed tracing)
 * - User information (authentication)
 * - Tenant information (multi-tenancy)
 *
 * @example
 * ```typescript
 * // Usage in Command Handler
 * async execute(command: CreateProductCommand): Promise<string> {
 *   const context = this.requestContext.current();
 *
 *   // Add correlation ID to domain event
 *   product.addDomainEvent(new ProductCreatedEvent(
 *     product.id,
 *     data,
 *     { correlationId: context.correlationId }
 *   ));
 * }
 * ```
 */
export interface IRequestContext {
  /**
   * Correlation ID for distributed tracing
   * Được tạo ở đầu request và truyền qua tất cả services
   */
  readonly correlationId: string;

  /**
   * Causation ID - ID của event/command gây ra request này
   * Dùng để track event chain
   */
  readonly causationId?: string;

  /**
   * User ID của user đang thực hiện request
   */
  readonly userId?: string;

  /**
   * Tenant ID (cho multi-tenant applications)
   */
  readonly tenantId?: string;

  /**
   * Request timestamp
   */
  readonly timestamp: Date;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Request Context Provider Interface (Port)
 *
 * Interface để lấy và set request context
 * Implementation sử dụng AsyncLocalStorage
 */
export interface IRequestContextProvider {
  /**
   * Lấy context hiện tại
   * @returns Current request context hoặc undefined nếu không có
   */
  current(): IRequestContext | undefined;

  /**
   * Chạy callback trong context cụ thể
   *
   * @param context Request context
   * @param callback Function cần chạy trong context
   */
  run<T>(context: IRequestContext, callback: () => T): T;

  /**
   * Tạo context mới với correlation ID
   *
   * @param correlationId Optional correlation ID (tự generate nếu không có)
   * @param userId Optional user ID
   */
  create(correlationId?: string, userId?: string): IRequestContext;
}
