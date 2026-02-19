import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a business rule or domain invariant is violated.
 *
 * Use this instead of a generic `BadRequestException` when the failure
 * originates from domain logic rather than input validation.
 *
 * @example
 * ```ts
 * if (account.balance < amount) {
 *   throw new BusinessException('Insufficient funds for this transfer');
 * }
 *
 * if (order.status === 'SHIPPED') {
 *   throw new BusinessException(
 *     'Cannot cancel an order that has already been shipped',
 *     'ORDER_ALREADY_SHIPPED',
 *   );
 * }
 * ```
 */
export class BusinessException extends HttpException {
  constructor(
    message: string,
    /** Machine-readable error code for programmatic handling. */
    public readonly errorCode?: string,
  ) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'BusinessRuleViolation',
        message,
        ...(errorCode && { errorCode }),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
