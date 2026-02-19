import { SetMetadata } from '@nestjs/common';

/**
 * Configuration object for paginated endpoints.
 */
export interface PaginationOptions {
  /** Default page number when query param is omitted (default: `1`). */
  defaultPage?: number;

  /** Default items per page when query param is omitted (default: `20`). */
  defaultLimit?: number;

  /** Maximum allowed items per page to prevent abuse (default: `100`). */
  maxLimit?: number;
}

/** Metadata key used by pagination pipes / interceptors. */
export const PAGINATION_KEY = 'pagination';

/**
 * Default pagination values applied when no options are provided.
 */
export const DEFAULT_PAGINATION: Required<PaginationOptions> = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
};

/**
 * Marks a route as paginated and stores normalised pagination defaults in
 * route metadata.
 *
 * A downstream pipe or interceptor should read the `PAGINATION_KEY` metadata
 * via `Reflector`, merge it with the incoming `page` / `limit` query parameters,
 * clamp them within bounds, and inject the final values into the request or
 * handler arguments.
 *
 * @param options - Partial overrides for page, limit, and maxLimit defaults.
 *
 * @example
 * ```ts
 * @ApiPagination({ defaultLimit: 25, maxLimit: 50 })
 * @Get()
 * findAll(@Query('page') page: number, @Query('limit') limit: number) {
 *   // page and limit are guaranteed to be sane by the pagination pipe
 *   return this.service.findAll(page, limit);
 * }
 * ```
 *
 * @example
 * ```ts
 * // Inside a PaginationPipe or Interceptor
 * const options = this.reflector.get<Required<PaginationOptions>>(
 *   PAGINATION_KEY,
 *   context.getHandler(),
 * );
 * const page  = Math.max(1, Number(query.page)  || options.defaultPage);
 * const limit = Math.min(options.maxLimit, Math.max(1, Number(query.limit) || options.defaultLimit));
 * ```
 */
export const ApiPagination = (options?: PaginationOptions) =>
  SetMetadata(PAGINATION_KEY, {
    ...DEFAULT_PAGINATION,
    ...options,
  });
