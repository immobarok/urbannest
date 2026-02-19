import { RequestContext } from './request.context';

// ──────────────────────────────────────────────────────────────
// User Context — typed accessor for the authenticated user
// ──────────────────────────────────────────────────────────────

/**
 * Minimal payload shape every JWT / session strategy should satisfy.
 *
 * Extend or intersect this interface with your project-specific
 * fields (roles, permissions, tenant, etc.).
 */
export interface BaseUserPayload {
  /** Primary user identifier (UUID, database PK, etc.). */
  id: string;

  /** User's email address (if present in the token). */
  email?: string;

  /** Roles assigned to the user, used by RBAC guards. */
  roles?: string[];
}

/**
 * UserContext — Static helper for extracting the authenticated user
 * from the current {@link RequestContext}.
 *
 * Works alongside the `@CurrentUser()` parameter decorator but is
 * designed for **service-layer** usage where param decorators are
 * not available.
 *
 * All methods are safe to call outside a request scope — they
 * return `undefined` instead of throwing.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class OrderService {
 *   create(dto: CreateOrderDto) {
 *     const userId = UserContext.currentUserId();
 *     if (!userId) throw new UnauthorizedException();
 *
 *     return this.prisma.order.create({
 *       data: { ...dto, createdBy: userId },
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Typed access — provide your project's JWT payload interface
 * interface JwtPayload extends BaseUserPayload {
 *   tenantId: string;
 *   permissions: string[];
 * }
 *
 * const user = UserContext.currentUser<JwtPayload>();
 * console.log(user?.tenantId);
 * ```
 */
export class UserContext {
  // ── Accessors ──────────────────────────────────────────────

  /**
   * Returns the full authenticated user object from the current
   * request context, cast to the supplied generic type.
   *
   * @typeParam T - Shape of the user payload (defaults to {@link BaseUserPayload}).
   * @returns The user payload, or `undefined` when outside a request scope
   *          or the route is unauthenticated.
   */
  static currentUser<T extends Record<string, any> = BaseUserPayload>():
    | T
    | undefined {
    return RequestContext.currentUser<T>();
  }

  /**
   * Shorthand — returns only the user's `id` field.
   *
   * @returns User ID string or `undefined`.
   */
  static currentUserId(): string | undefined {
    return (this.currentUser() as BaseUserPayload | undefined)?.id;
  }

  /**
   * Shorthand — returns the user's email address.
   *
   * @returns Email string or `undefined`.
   */
  static currentUserEmail(): string | undefined {
    return (this.currentUser() as BaseUserPayload | undefined)?.email;
  }

  /**
   * Shorthand — returns the user's assigned roles.
   *
   * @returns Array of role strings, or an empty array when no roles
   *          are present.
   */
  static currentUserRoles(): string[] {
    return (
      (this.currentUser() as BaseUserPayload | undefined)?.roles ?? []
    );
  }

  /**
   * Check whether the current user has **all** of the specified roles.
   *
   * @param requiredRoles - One or more role strings to check.
   * @returns `true` when the user possesses every listed role.
   *
   * @example
   * ```ts
   * if (!UserContext.hasRoles('ADMIN', 'MANAGER')) {
   *   throw new ForbiddenActionException('Insufficient roles');
   * }
   * ```
   */
  static hasRoles(...requiredRoles: string[]): boolean {
    const userRoles = this.currentUserRoles();
    return requiredRoles.every((role) => userRoles.includes(role));
  }

  /**
   * Check whether the current user has **at least one** of the
   * specified roles.
   *
   * @param roles - Roles to check against.
   * @returns `true` when the user possesses any one of the listed roles.
   */
  static hasAnyRole(...roles: string[]): boolean {
    const userRoles = this.currentUserRoles();
    return roles.some((role) => userRoles.includes(role));
  }

  /**
   * Returns `true` when a valid user payload exists in the current
   * request context.
   */
  static isAuthenticated(): boolean {
    return this.currentUser() !== undefined;
  }
}
