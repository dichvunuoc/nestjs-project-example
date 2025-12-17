import { BaseException } from './base.exception';

/**
 * Conflict Exception
 * Thrown when request conflicts with current state of resource
 * HTTP Status: 409
 */
export class ConflictException extends BaseException {
  constructor(
    message: string = 'Resource conflict',
    code: string = 'CONFLICT',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  /**
   * Static factory method for duplicate resource
   */
  static duplicate(
    resourceType: string,
    field?: string,
    value?: string,
  ): ConflictException {
    const message = field
      ? `${resourceType} with ${field} '${value}' already exists`
      : `${resourceType} already exists`;
    return new ConflictException(message, 'DUPLICATE_RESOURCE', {
      resourceType,
      field,
      value,
    });
  }

  /**
   * Static factory method for state conflict
   */
  static invalidState(
    resourceType: string,
    currentState: string,
    requiredState?: string,
  ): ConflictException {
    const message = requiredState
      ? `${resourceType} is in '${currentState}' state, but '${requiredState}' is required`
      : `${resourceType} is in invalid state: ${currentState}`;
    return new ConflictException(message, 'INVALID_STATE', {
      resourceType,
      currentState,
      requiredState,
    });
  }

  /**
   * Static factory method for version conflict
   */
  static versionConflict(
    resourceType: string,
    resourceId: string,
    expectedVersion: number,
    actualVersion: number,
  ): ConflictException {
    return new ConflictException(
      `${resourceType} '${resourceId}' version conflict: expected ${expectedVersion}, got ${actualVersion}`,
      'VERSION_CONFLICT',
      {
        resourceType,
        resourceId,
        expectedVersion,
        actualVersion,
      },
    );
  }
}



