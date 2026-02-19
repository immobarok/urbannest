import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a uniqueness constraint would be violated (e.g. duplicate
 * email, slug, or any field with a unique index).
 *
 * Returns `409 Conflict` to clearly signal to API consumers that the
 * resource already exists, as opposed to a generic 400 or 500.
 *
 * @example
 * ```ts
 * const existing = await this.prisma.user.findUnique({ where: { email } });
 * if (existing) {
 *   throw new DuplicateResourceException('User', 'email', email);
 * }
 * ```
 */
export class DuplicateResourceException extends HttpException {
  constructor(entity: string, field: string, value?: string) {
    const message = value
      ? `${entity} with ${field} "${value}" already exists`
      : `${entity} with the given ${field} already exists`;

    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'DuplicateResource',
        message,
        entity,
        field,
      },
      HttpStatus.CONFLICT,
    );
  }
}
