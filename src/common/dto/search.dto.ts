import { IsOptional, IsString } from 'class-validator';

/**
 * Base DTO for endpoints that support text search filtering.
 *
 * Provides a generic `search` string that services can apply against
 * any text column (name, title, description, etc.) using LIKE / ILIKE
 * or full-text-search indexes.
 *
 * @example
 * ```ts
 * export class ListProductsDto extends IntersectionType(
 *   PaginationDto,
 *   SortDto,
 *   SearchDto,
 * ) {}
 *
 * @Get()
 * findAll(@Query() query: ListProductsDto) {
 *   return this.service.search(query.search, {
 *     skip: (query.page - 1) * query.limit,
 *     take: query.limit,
 *   });
 * }
 * ```
 */
export class SearchDto {
  /** Free-text search term, matched against relevant columns. */
  @IsOptional()
  @IsString()
  search?: string;
}
