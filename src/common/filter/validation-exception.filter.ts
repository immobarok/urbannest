import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Shape of a single field-level validation error produced by
 * `class-validator` when used with NestJS's `ValidationPipe`.
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * ValidationExceptionFilter – Intercepts `BadRequestException` instances
 * thrown by NestJS's `ValidationPipe` and re-formats the error response
 * into a consistent, frontend-friendly shape.
 *
 * NestJS validation pipes throw a `BadRequestException` whose response
 * body can be a string, an object with a `message` array, or other shapes.
 * This filter normalises all of them into:
 *
 * ```json
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "error": "ValidationError",
 *   "message": "Validation failed on 3 field(s)",
 *   "errors": [
 *     { "field": "email", "message": "email must be an email" },
 *     ...
 *   ],
 *   "path": "/api/users",
 *   "timestamp": "2026-..."
 * }
 * ```
 *
 * Register globally in `main.ts`:
 * ```ts
 * app.useGlobalFilters(new ValidationExceptionFilter());
 * ```
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract class-validator messages
    const rawMessages =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message
        : exception.message;

    const errors: ValidationError[] = this.normaliseErrors(rawMessages);
    const summary =
      errors.length === 1
        ? errors[0].message
        : `Validation failed on ${errors.length} field(s)`;

    const correlationId = (request as any).correlationId as
      | string
      | undefined;

    this.logger.warn(
      `[${correlationId ?? 'N/A'}] Validation failed: ${request.method} ${request.originalUrl} – ${summary}`,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      error: 'ValidationError',
      message: summary,
      errors,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    });
  }

  /**
   * Converts the heterogeneous `message` shape from `ValidationPipe` into
   * a uniform `ValidationError[]`.
   */
  private normaliseErrors(
    messages: unknown,
  ): ValidationError[] {
    if (Array.isArray(messages)) {
      return messages.map((msg) => {
        if (typeof msg === 'string') {
          // class-validator returns strings like "email must be an email"
          const parts = msg.split(' ');
          return { field: parts[0], message: msg };
        }
        // Already an object { field, message }
        return msg as ValidationError;
      });
    }

    if (typeof messages === 'string') {
      return [{ field: 'unknown', message: messages }];
    }

    return [{ field: 'unknown', message: 'Validation failed' }];
  }
}
