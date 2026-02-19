import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when the authenticated user does not have sufficient permissions
 * to perform the requested action, even though they are authenticated.
 *
 * Returns `403 Forbidden`. Use this instead of `UnauthorizedException`
 * when authentication succeeded but **authorisation** failed.
 *
 * @example
 * ```ts
 * if (!user.roles.includes(Role.ADMIN)) {
 *   throw new ForbiddenActionException(
 *     'Only administrators can delete users',
 *     'DELETE_USER',
 *   );
 * }
 * ```
 */
export class ForbiddenActionException extends HttpException {
  constructor(
    message = 'You do not have permission to perform this action',
    /** The action that was denied, for audit logging. */
    public readonly action?: string,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'ForbiddenAction',
        message,
        ...(action && { action }),
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
