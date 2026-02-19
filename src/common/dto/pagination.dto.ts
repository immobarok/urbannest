import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Base DTO for any paginated list endpoint.
 *
 * Provides `page` and `limit` query parameters with sensible defaults
 * and validation constraints. Extend or compose this into your own
 * request DTOs.
 *
 * Requires `class-validator` and `class-transformer` to be installed
 * and a global `ValidationPipe` with `transform: true` in `main.ts`.
 *
 * @example
 * ```ts
 * @Get()
 * findAll(@Query() query: PaginationDto) {
 *   const { page, limit } = query;
 *   const skip = (page - 1) * limit;
 *   return this.service.findAll({ skip, take: limit });
 * }
 * ```
 */
export class PaginationDto {
  /** Page number (1-indexed). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Number of items per page. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
