import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * Allowed sort directions.
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Base DTO for endpoints that support sorting.
 *
 * Provides a `sortBy` field name and `sortOrder` direction. Extend this
 * or compose it with `PaginationDto` in your own request DTOs.
 *
 * @example
 * ```ts
 * // Compose pagination + sorting
 * export class ListUsersDto extends IntersectionType(
 *   PaginationDto,
 *   SortDto,
 * ) {}
 *
 * @Get()
 * findAll(@Query() query: ListUsersDto) {
 *   return this.service.findAll({
 *     orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
 *     skip: (query.page - 1) * query.limit,
 *     take: query.limit,
 *   });
 * }
 * ```
 */
export class SortDto {
  /** Column / field to sort by (e.g. `'createdAt'`, `'name'`). */
  @IsOptional()
  @IsString()
  sortBy?: string;

  /** Sort direction – `asc` or `desc`. Defaults to `desc`. */
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
