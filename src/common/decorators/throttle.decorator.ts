import { SetMetadata } from '@nestjs/common';

/**
 * Configuration for per-route rate limiting.
 */
export interface ThrottleOptions {
  /** Maximum number of requests allowed within the TTL window. */
  limit: number;

  /** Time-to-live window in **seconds**. */
  ttl: number;
}

/** Metadata key consumed by a throttle guard / interceptor. */
export const THROTTLE_KEY = 'throttle';

/** Metadata key to skip global throttling for a specific route. */
export const SKIP_THROTTLE_KEY = 'skip-throttle';

/**
 * Applies per-route rate-limiting metadata.
 *
 * A `ThrottleGuard` should read the `THROTTLE_KEY` metadata via `Reflector`
 * and enforce the specified `limit` within the given `ttl` window, keyed by
 * the client's IP (or authenticated user ID for more granular control).
 *
 * @param options - Rate-limit configuration (`limit` and `ttl`).
 *
 * @example
 * ```ts
 * // Allow 5 login attempts per 60-second window
 * @Throttle({ limit: 5, ttl: 60 })
 * @Post('login')
 * login(@Body() dto: LoginDto) { ... }
 *
 * // Tight limit for password reset
 * @Throttle({ limit: 3, ttl: 300 })
 * @Post('forgot-password')
 * forgotPassword(@Body() dto: ForgotPasswordDto) { ... }
 * ```
 */
export const Throttle = (options: ThrottleOptions) =>
  SetMetadata(THROTTLE_KEY, options);

/**
 * Opts a route or controller **out** of the global throttle guard.
 *
 * Useful for internal health-check or webhook endpoints that should never
 * be rate-limited.
 *
 * @example
 * ```ts
 * @SkipThrottle()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);
