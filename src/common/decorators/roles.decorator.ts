import { SetMetadata } from '@nestjs/common';

/**
 * Enum of well-known application roles.
 *
 * Extend this as your domain grows. Using an enum instead of raw strings
 * prevents typos and enables IDE auto-complete.
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

/**
 * Metadata key consumed by a `RolesGuard` to enforce RBAC.
 *
 * @example
 * ```ts
 * // Inside your RolesGuard
 * const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
 *   context.getHandler(),
 *   context.getClass(),
 * ]);
 * if (!requiredRoles) return true;
 * return requiredRoles.some((role) => user.roles.includes(role));
 * ```
 */
export const ROLES_KEY = 'roles';

/**
 * Restricts access to a route or controller to users that hold **at least one**
 * of the specified roles.
 *
 * The decorator sets `ROLES_KEY` metadata that a `RolesGuard` reads via the
 * `Reflector`. If no roles are set the guard should allow the request through.
 *
 * Can be applied at both the **controller** and **method** level. Method-level
 * roles override controller-level roles when using `getAllAndOverride`.
 *
 * @param roles - One or more `Role` values the user must possess.
 *
 * @example
 * ```ts
 * // Require admin OR moderator
 * @Roles(Role.ADMIN, Role.MODERATOR)
 * @Delete(':id')
 * remove(@Param('id') id: string) { ... }
 *
 * // Controller-wide restriction
 * @Roles(Role.ADMIN)
 * @Controller('admin')
 * export class AdminController { ... }
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
