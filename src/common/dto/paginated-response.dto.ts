/**
 * Generic wrapper for paginated API responses.
 *
 * This is **not** a class-validator DTO but a plain interface / type that
 * services and controllers use to wrap their return values.
 *
 * @example
 * ```ts
 * async findAll(query: PaginationDto): Promise<PaginatedResponseDto<UserEntity>> {
 *   const [data, total] = await this.prisma.$transaction([
 *     this.prisma.user.findMany({ skip: (query.page - 1) * query.limit, take: query.limit }),
 *     this.prisma.user.count(),
 *   ]);
 *
 *   return {
 *     data,
 *     meta: {
 *       total,
 *       page: query.page,
 *       limit: query.limit,
 *       totalPages: Math.ceil(total / query.limit),
 *       hasNextPage: query.page * query.limit < total,
 *       hasPreviousPage: query.page > 1,
 *     },
 *   };
 * }
 * ```
 */
export interface PaginationMeta {
  /** Total number of records matching the query (before pagination). */
  total: number;
  /** Current page number. */
  page: number;
  /** Items per page. */
  limit: number;
  /** Total number of pages. */
  totalPages: number;
  /** Whether a next page exists. */
  hasNextPage: boolean;
  /** Whether a previous page exists. */
  hasPreviousPage: boolean;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMeta;
}
