import { RequestContext } from './request.context';

// ──────────────────────────────────────────────────────────────
// Tenant Context — multi-tenancy helpers
// ──────────────────────────────────────────────────────────────

/**
 * Default header name used to resolve the tenant identifier.
 * Override by providing a custom header to the resolver in your
 * middleware / guard.
 */
export const DEFAULT_TENANT_HEADER = 'x-tenant-id';

/**
 * Strategy used to resolve the tenant identifier for the current request.
 *
 * - `HEADER`  — read from the {@link DEFAULT_TENANT_HEADER} HTTP header.
 * - `TOKEN`   — extract from the authenticated user's JWT payload.
 * - `SUBDOMAIN` — derive from the request hostname (e.g. `acme.api.com`).
 */
export enum TenantResolutionStrategy {
  HEADER = 'HEADER',
  TOKEN = 'TOKEN',
  SUBDOMAIN = 'SUBDOMAIN',
}

/**
 * TenantContext — Static helper for accessing multi-tenancy metadata
 * stored in the current {@link RequestContext}.
 *
 * The middleware or guard responsible for tenant resolution should call
 * {@link RequestContext.update} with the resolved `tenantId`. This class
 * then provides convenient, type-safe accessors for downstream services.
 *
 * All methods are safe to call outside a request scope — they return
 * `undefined` (or `false`) instead of throwing.
 *
 * @example
 * ```ts
 * // In a middleware — resolve tenant from header
 * const tenantId = req.headers[DEFAULT_TENANT_HEADER] as string | undefined;
 * if (tenantId) {
 *   RequestContext.update({ tenantId });
 * }
 * ```
 *
 * @example
 * ```ts
 * // In a repository — scope queries by tenant
 * @Injectable()
 * export class ProductRepository {
 *   findAll() {
 *     const tenantId = TenantContext.currentTenantId();
 *     return this.prisma.product.findMany({
 *       where: { ...(tenantId && { tenantId }) },
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Guard — reject requests without a tenant
 * if (TenantContext.requireTenant()) {
 *   // tenantId is guaranteed to be defined here
 * }
 * ```
 */
export class TenantContext {
  // ── Accessors ──────────────────────────────────────────────

  /**
   * Returns the tenant ID for the current request, or `undefined`
   * when multi-tenancy is not active.
   */
  static currentTenantId(): string | undefined {
    return RequestContext.currentTenantId();
  }

  /**
   * Returns `true` when a tenant ID has been resolved for the
   * current request.
   */
  static hasTenant(): boolean {
    return this.currentTenantId() !== undefined;
  }

  /**
   * Returns the tenant ID or throws if none was resolved.
   *
   * Use in code paths that **must** operate within a tenant scope.
   *
   * @throws {Error} When no tenant context is available.
   *
   * @example
   * ```ts
   * const tenantId = TenantContext.requireTenantId();
   * // tenantId is guaranteed to be a string here
   * ```
   */
  static requireTenantId(): string {
    const tenantId = this.currentTenantId();
    if (!tenantId) {
      throw new Error(
        'TenantContext: Tenant ID is required but was not resolved for this request. ' +
          'Ensure the tenant-resolution middleware is applied.',
      );
    }
    return tenantId;
  }

  // ── Helpers ────────────────────────────────────────────────

  /**
   * Resolve a tenant ID from a hostname by extracting the first
   * subdomain label.
   *
   * Useful when using `TenantResolutionStrategy.SUBDOMAIN`.
   *
   * @param hostname - Full hostname, e.g. `acme.api.example.com`.
   * @returns The subdomain (`acme`), or `undefined` for bare domains.
   *
   * @example
   * ```ts
   * TenantContext.tenantFromSubdomain('acme.api.example.com'); // 'acme'
   * TenantContext.tenantFromSubdomain('api.example.com');       // 'api'
   * TenantContext.tenantFromSubdomain('localhost');              // undefined
   * ```
   */
  static tenantFromSubdomain(hostname: string): string | undefined {
    const parts = hostname.split('.');
    return parts.length > 2 ? parts[0] : undefined;
  }
}
