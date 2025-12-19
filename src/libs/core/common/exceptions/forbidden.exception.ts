import { BaseException } from './base.exception';

/**
 * Forbidden Exception
 * Thrown when user is authenticated but doesn't have permission
 * HTTP Status: 403
 */
export class ForbiddenException extends BaseException {
  constructor(
    message: string = 'Forbidden',
    code: string = 'FORBIDDEN',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  /**
   * Static factory method for insufficient permissions
   */
  static insufficientPermissions(
    requiredPermission?: string,
    userId?: string,
  ): ForbiddenException {
    return new ForbiddenException(
      requiredPermission
        ? `Insufficient permissions. Required: ${requiredPermission}`
        : 'Insufficient permissions',
      'INSUFFICIENT_PERMISSIONS',
      {
        requiredPermission,
        userId,
      },
    );
  }

  /**
   * Static factory method for role-based access
   */
  static insufficientRole(
    requiredRole: string,
    userRole?: string,
  ): ForbiddenException {
    return new ForbiddenException(
      `Insufficient role. Required: ${requiredRole}`,
      'INSUFFICIENT_ROLE',
      {
        requiredRole,
        userRole,
      },
    );
  }

  /**
   * Static factory method for resource access denied
   */
  static resourceAccessDenied(
    resourceType: string,
    resourceId?: string,
    userId?: string,
  ): ForbiddenException {
    return new ForbiddenException(
      `Access denied to ${resourceType}${resourceId ? ` '${resourceId}'` : ''}`,
      'RESOURCE_ACCESS_DENIED',
      {
        resourceType,
        resourceId,
        userId,
      },
    );
  }
}
