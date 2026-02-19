import { AsyncLocalStorage } from 'async_hooks';

// ──────────────────────────────────────────────────────────────
// Request Context — per-request metadata via AsyncLocalStorage
// ──────────────────────────────────────────────────────────────

/**
 * Shape of the data stored in every request-scoped context.
 *
 * Extend this interface when you need additional per-request fields
 * (e.g. feature flags, A/B variant, locale).
 */
export interface RequestContextStore {
  /** UUIDv4 correlation ID for distributed tracing. */
  correlationId: string;

  /** ISO-8601 timestamp when the request entered the pipeline. */
  requestTimestamp: string;

  /** Client IP address (respects `X-Forwarded-For` when behind a proxy). */
  ip: string;

  /** Raw `User-Agent` header value. */
  userAgent: string;

  /** HTTP method — `GET`, `POST`, `PATCH`, etc. */
  method: string;

  /** Request path, e.g. `/api/v1/users`. */
  url: string;

  /**
   * Authenticated user payload attached by an auth guard.
   * `undefined` for unauthenticated (public) routes.
   */
  user?: Record<string, any>;

  /**
   * Tenant identifier resolved from `X-Tenant-Id` header or
   * the user token.  `undefined` when multi-tenancy is not in use.
   */
  tenantId?: string;
}

/**
 * RequestContext — Zero-dependency, request-scoped context provider
 * backed by Node.js `AsyncLocalStorage`.
 *
 * Stores per-request metadata (correlation ID, timestamp, IP, user,
 * tenant, etc.) that **any** service in the call chain can read
 * without constructor injection or passing context through parameters.
 *
 * ### How it works
 *
 * A NestJS middleware (or interceptor) calls {@link RequestContext.run}
 * at the start of each request.  Every function executed inside that
 * callback — including async continuations — can call
 * {@link RequestContext.currentContext} to retrieve the store.
 *
 * @example
 * ```ts
 * // In a middleware / interceptor — initialise per-request store
 * RequestContext.run(
 *   {
 *     correlationId: uuid(),
 *     requestTimestamp: new Date().toISOString(),
 *     ip: req.ip,
 *     userAgent: req.get('user-agent') ?? 'unknown',
 *     method: req.method,
 *     url: req.originalUrl,
 *   },
 *   () => next(),
 * );
 *
 * // In any downstream service
 * const ctx = RequestContext.currentContext();
 * console.log(ctx?.correlationId); // '2c5ea4c0-...'
 * ```
 *
 * @example
 * ```ts
 * // Safe access with fallback
 * const corrId = RequestContext.correlationId() ?? 'no-context';
 * ```
 */
export class RequestContext {
  /** Internal async-local store — one per Node.js process. */
  private static readonly storage =
    new AsyncLocalStorage<RequestContextStore>();

  // ── Lifecycle ──────────────────────────────────────────────

  /**
   * Execute `callback` within a new request-scoped context.
   *
   * @param store  - Initial metadata for this request.
   * @param callback - The work to run inside the scoped context.
   */
  static run<T>(store: RequestContextStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  // ── Accessors ──────────────────────────────────────────────

  /**
   * Returns the full {@link RequestContextStore} for the current
   * async continuation, or `undefined` when called outside of a
   * {@link RequestContext.run} scope.
   */
  static currentContext(): RequestContextStore | undefined {
    return this.storage.getStore();
  }

  /**
   * Shorthand — returns the correlation ID for the current request.
   *
   * @returns Correlation ID string or `undefined` if no context exists.
   */
  static correlationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  /**
   * Shorthand — returns the authenticated user payload, or `undefined`
   * when no context exists or the route is public.
   */
  static currentUser<T extends Record<string, any> = Record<string, any>>():
    | T
    | undefined {
    return this.storage.getStore()?.user as T | undefined;
  }

  /**
   * Shorthand — returns the resolved tenant ID, or `undefined` when
   * multi-tenancy is not active for this request.
   */
  static currentTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  // ── Mutators ───────────────────────────────────────────────

  /**
   * Merge additional fields into the current store.
   *
   * Useful when an auth guard resolves the user **after** the
   * middleware has already initialised the context.
   *
   * @param patch - Partial store fields to merge.
   * @throws {Error} When called outside of a {@link RequestContext.run} scope.
   *
   * @example
   * ```ts
   * // Inside an auth guard, after token verification:
   * RequestContext.update({ user: decodedToken, tenantId: decodedToken.tenantId });
   * ```
   */
  static update(patch: Partial<RequestContextStore>): void {
    const store = this.storage.getStore();
    if (!store) {
      throw new Error(
        'RequestContext.update() called outside of a RequestContext.run() scope',
      );
    }
    Object.assign(store, patch);
  }
}
