import { IsDateString, IsOptional } from 'class-validator';

/**
 * Base DTO for endpoints that support date-range filtering.
 *
 * Provides optional `startDate` and `endDate` ISO-8601 strings.
 * Compose with `PaginationDto` and `SortDto` for list endpoints
 * that need date-range queries.
 *
 * @example
 * ```ts
 * export class ListOrdersDto extends IntersectionType(
 *   PaginationDto,
 *   DateRangeDto,
 * ) {}
 *
 * @Get()
 * findAll(@Query() query: ListOrdersDto) {
 *   return this.service.findAll({
 *     where: {
 *       createdAt: {
 *         ...(query.startDate && { gte: new Date(query.startDate) }),
 *         ...(query.endDate   && { lte: new Date(query.endDate) }),
 *       },
 *     },
 *   });
 * }
 * ```
 */
export class DateRangeDto {
  /** Start of the date range (ISO 8601). */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** End of the date range (ISO 8601). */
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
