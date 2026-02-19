import { SetMetadata } from '@nestjs/common';

/** Metadata key for a custom cache identifier. */
export const CACHE_KEY_METADATA = 'cache-key';

/** Metadata key for per-route cache TTL (in seconds). */
export const CACHE_TTL_METADATA = 'cache-ttl';

/** Metadata key to completely disable caching on a route. */
export const NO_CACHE_KEY = 'no-cache';

/**
 * Assigns a custom cache key to a route.
 *
 * When a caching interceptor is in place, it should resolve the cache key
 * from this metadata instead of auto-generating one from the URL. This is
 * useful when multiple routes should share the same cache entry, or when
 * you need a human-readable key for debugging / invalidation.
 *
 * @param key - A unique string identifier for the cache entry.
 *
 * @example
 * ```ts
 * @CacheKey('dashboard-stats')
 * @Get('stats')
 * getDashboardStats() { ... }
 * ```
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

/**
 * Overrides the default cache TTL for a specific route.
 *
 * @param seconds - Time-to-live in seconds before the cached value expires.
 *
 * @example
 * ```ts
 * @CacheKey('product-list')
 * @CacheTTL(600) // 10 minutes
 * @Get('products')
 * getProducts() { ... }
 * ```
 */
export const CacheTTL = (seconds: number) =>
  SetMetadata(CACHE_TTL_METADATA, seconds);

/**
 * Disables caching entirely for a route, even when a global caching
 * interceptor is active.
 *
 * Use this on endpoints that must always return fresh data, such as
 * real-time dashboards or user-specific content behind auth.
 *
 * @example
 * ```ts
 * @NoCache()
 * @Get('live-feed')
 * getLiveFeed() { ... }
 * ```
 */
export const NoCache = () => SetMetadata(NO_CACHE_KEY, true);
