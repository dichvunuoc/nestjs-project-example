import { BaseException } from './base.exception';

/**
 * Not Found Exception
 * Thrown when a requested resource is not found
 * HTTP Status: 404
 */
export class NotFoundException extends BaseException {
  constructor(
    message: string = 'Resource not found',
    code: string = 'NOT_FOUND',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  /**
   * Static factory method for resource not found
   */
  static resource(
    resourceType: string,
    resourceId?: string,
  ): NotFoundException {
    const message = resourceId
      ? `${resourceType} with id '${resourceId}' not found`
      : `${resourceType} not found`;
    return new NotFoundException(
      message,
      `${resourceType.toUpperCase()}_NOT_FOUND`,
      {
        resourceType,
        resourceId,
      },
    );
  }

  /**
   * Static factory method for entity not found
   */
  static entity(entityName: string, entityId: string): NotFoundException {
    return NotFoundException.resource(entityName, entityId);
  }
}



