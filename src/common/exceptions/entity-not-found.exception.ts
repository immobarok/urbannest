import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a requested business entity (user, order, product, etc.)
 * cannot be found in the data store.
 *
 * Extends `HttpException` with a `404 Not Found` status and accepts an
 * optional `entity` name that is included in the error message for
 * easier debugging.
 *
 * @example
 * ```ts
 * const user = await this.prisma.user.findUnique({ where: { id } });
 * if (!user) throw new EntityNotFoundException('User', id);
 * ```
 */
export class EntityNotFoundException extends HttpException {
  constructor(entity: string, identifier?: string | number) {
    const message = identifier
      ? `${entity} with identifier "${identifier}" was not found`
      : `${entity} was not found`;

    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'EntityNotFound',
        message,
        entity,
        identifier: identifier?.toString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
