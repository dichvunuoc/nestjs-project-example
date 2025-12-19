import {
  SetMetadata,
  UseGuards,
  applyDecorators,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import type { IRequestContextProvider } from '../../core';
import { REQUEST_CONTEXT_TOKEN } from '../../core';

/**
 * Permission metadata key
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Role metadata key
 */
export const ROLES_KEY = 'roles';

/**
 * Resource metadata key
 */
export const RESOURCE_KEY = 'resource';

/**
 * Resource access metadata key
 */
export const RESOURCE_ACCESS_KEY = 'resourceAccess';

/**
 * Permission levels
 */
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

/**
 * Common roles
 */
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * Resource access types
 */
export enum ResourceAccess {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

/**
 * Require specific permissions for a route or handler
 *
 * Usage:
 * ```typescript
 * @RequirePermission('product:create')
 * @RequirePermission(['product:read', 'product:update'])
 * export class ProductController {
 *   @RequirePermission('product:delete')
 *   async deleteProduct() {
 *     // Handler implementation
 *   }
 * }
 * ```
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Require specific roles for a route or handler
 *
 * Usage:
 * ```typescript
 * @RequireRole(Role.ADMIN)
 * @RequireRole([Role.ADMIN, Role.MANAGER])
 * export class AdminController {
 *   @RequireRole(Role.ADMIN)
 *   async deleteUser() {
 *     // Only admin can access
 *   }
 * }
 * ```
 */
export const RequireRole = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Require resource-based access control
 *
 * Usage:
 * ```typescript
 * @RequireResource('product', ResourceAccess.READ)
 * @RequireResource({
 *   resource: 'order',
 *   access: [ResourceAccess.READ, ResourceAccess.UPDATE],
 *   condition: 'user == resource.ownerId'
 * })
 * export class OrderController {
 *   @RequireResource('order', ResourceAccess.DELETE, {
 *     condition: 'user == resource.ownerId OR user.roles.includes("admin")'
 *   })
 *   async deleteOrder(@Param('id') id: string) {
 *     // User can only delete their own orders unless admin
 *   }
 * }
 * ```
 */
export const RequireResource = (
  resource: string,
  access: ResourceAccess | ResourceAccess[],
  options?: {
    condition?: string;
    ownerField?: string;
  },
) => {
  const metadata = {
    resource,
    access: Array.isArray(access) ? access : [access],
    condition: options?.condition,
    ownerField: options?.ownerField || 'ownerId',
  };
  return SetMetadata(RESOURCE_ACCESS_KEY, metadata);
};

/**
 * RBAC Guard - Role-Based Access Control
 *
 * Implements role-based authorization by checking user roles
 * against required roles for the route.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some(
      (role) => user.roles?.includes(role) || user.role === role,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Required roles: ${requiredRoles.join(', ')}. User roles: ${user.roles?.join(', ') || 'none'}`,
      );
    }

    return true;
  }
}

/**
 * Permission Guard - Permission-Based Access Control
 *
 * Implements fine-grained permission checking.
 * Permissions are typically in format: "resource:action"
 * e.g., "product:read", "product:create", "order:update"
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext: IRequestContextProvider,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions =
      user.permissions || this.derivePermissionsFromRoles(user.roles || []);

    const hasPermission = requiredPermissions.every((permission) =>
      this.hasPermission(userPermissions, permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Required permissions: ${requiredPermissions.join(', ')}. User permissions: ${userPermissions.join(', ') || 'none'}`,
      );
    }

    return true;
  }

  /**
   * Derive permissions from user roles
   */
  private derivePermissionsFromRoles(roles: string[]): string[] {
    const permissions: string[] = [];

    for (const role of roles) {
      switch (role) {
        case Role.ADMIN:
          permissions.push('*:*'); // Admin has all permissions
          break;
        case Role.MANAGER:
          permissions.push(
            'product:read',
            'product:create',
            'product:update',
            'order:read',
            'order:update',
            'user:read',
          );
          break;
        case Role.USER:
          permissions.push(
            'product:read',
            'order:create',
            'order:read',
            'order:update',
          );
          break;
        case Role.GUEST:
          permissions.push('product:read');
          break;
      }
    }

    return permissions;
  }

  /**
   * Check if user has the required permission
   */
  private hasPermission(
    userPermissions: string[],
    requiredPermission: string,
  ): boolean {
    // Check for wildcard permission
    if (userPermissions.includes('*:*')) {
      return true;
    }

    // Check for exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for resource wildcard (e.g., "product:*")
    const [resource, action] = requiredPermission.split(':');
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  }
}

/**
 * Resource Guard - Resource-Based Access Control
 *
 * Implements resource-level authorization with conditions.
 * Used for more granular access control based on resource ownership.
 */
@Injectable()
export class ResourceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext: IRequestContextProvider,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const resourceAccess = this.reflector.getAllAndOverride<{
      resource: string;
      access: ResourceAccess[];
      condition?: string;
      ownerField?: string;
    }>(RESOURCE_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    if (!resourceAccess) {
      return true; // No resource access required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has required access for the resource
    const hasAccess = this.checkResourceAccess(user, resourceAccess, request);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Insufficient access to ${resourceAccess.resource}:${resourceAccess.access.join(',')}`,
      );
    }

    return true;
  }

  /**
   * Check if user has required access to the resource
   */
  private checkResourceAccess(
    user: any,
    resourceAccess: any,
    request: any,
  ): boolean {
    // Admin has access to everything
    if (user.roles?.includes(Role.ADMIN)) {
      return true;
    }

    // Check resource-specific permissions
    for (const access of resourceAccess.access) {
      const permission = `${resourceAccess.resource}:${access}`;
      if (!this.hasPermission(user, permission)) {
        return false;
      }
    }

    // Check condition if specified
    if (resourceAccess.condition) {
      return this.evaluateCondition(
        resourceAccess.condition,
        user,
        request,
        resourceAccess.ownerField,
      );
    }

    return true;
  }

  /**
   * Check if user has specific permission
   */
  private hasPermission(user: any, permission: string): boolean {
    const userPermissions = user.permissions || [];
    return (
      userPermissions.includes('*:*') || userPermissions.includes(permission)
    );
  }

  /**
   * Evaluate access condition (simple implementation)
   * In production, consider using a proper expression engine
   */
  private evaluateCondition(
    condition: string,
    user: any,
    request: any,
    ownerField?: string,
  ): boolean {
    // Simple condition evaluation
    // Examples:
    // "user == resource.ownerId"
    // "user.roles.includes('admin')"
    // "user.id == resource.userId"

    // Replace common variables
    const evalCondition = condition
      .replace(/user/g, 'user')
      .replace(/resource\./g, 'resource.');

    // For resource-based conditions, we need access to the resource
    // This is a simplified implementation
    if (condition.includes('resource.ownerId')) {
      const resourceId = request.params?.id || request.body?.id;
      // In a real implementation, you would fetch the resource and check ownership
      return this.checkResourceOwnership(user, resourceId, ownerField);
    }

    if (condition.includes("user.roles.includes('admin')")) {
      return user.roles?.includes(Role.ADMIN) || false;
    }

    if (condition.includes('user.id ==')) {
      return this.checkUserIdMatch(user, request);
    }

    // Default to true for unknown conditions (in production, be more strict)
    return true;
  }

  /**
   * Check if user owns the resource
   */
  private checkResourceOwnership(
    user: any,
    resourceId: string,
    ownerField?: string,
  ): boolean {
    // This is a simplified implementation
    // In production, you would:
    // 1. Fetch the resource from database
    // 2. Check if user.id == resource[ownerField]
    return true; // Simplified for demo
  }

  /**
   * Check if user ID matches in condition
   */
  private checkUserIdMatch(user: any, request: any): boolean {
    const userId = user.id;
    const resourceUserId = request.body?.userId || request.params?.userId;
    return userId === resourceUserId;
  }
}

/**
 * Combined Security Decorator
 *
 * Applies all security measures with a single decorator.
 * Combines role, permission, and resource-based access control.
 */
export const Secure = (
  options: {
    roles?: Role[];
    permissions?: string[];
    resource?: {
      name: string;
      access: ResourceAccess | ResourceAccess[];
      condition?: string;
    };
  } = {},
) => {
  const decorators: any[] = [];

  if (options.roles) {
    decorators.push(RequireRole(...options.roles));
  }

  if (options.permissions) {
    decorators.push(RequirePermission(...options.permissions));
  }

  if (options.resource) {
    decorators.push(
      RequireResource(options.resource.name, options.resource.access, {
        condition: options.resource.condition,
      }),
    );
  }

  // Add guards
  const guards: any[] = [];
  if (options.roles) guards.push(RolesGuard);
  if (options.permissions) guards.push(PermissionsGuard);
  if (options.resource) guards.push(ResourceGuard);

  if (guards.length > 0) {
    decorators.push(UseGuards(...guards));
  }

  return applyDecorators(...decorators);
};
