import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when an incoming request payload fails structural or semantic
 * validation beyond what class-validator covers.
 *
 * Returns `400 Bad Request` with a list of per-field error messages so
 * that API consumers can display granular feedback.
 *
 * @example
 * ```ts
 * throw new ValidationFailedException([
 *   { field: 'email', message: 'Must be a valid email address' },
 *   { field: 'age',   message: 'Must be at least 18' },
 * ]);
 * ```
 */
export interface FieldError {
  /** The field / property that failed validation. */
  field: string;
  /** Human-readable description of the failure. */
  message: string;
}

export class ValidationFailedException extends HttpException {
  constructor(public readonly errors: FieldError[]) {
    const message =
      errors.length === 1
        ? errors[0].message
        : `Validation failed on ${errors.length} field(s)`;

    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'ValidationFailed',
        message,
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
