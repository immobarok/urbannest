import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseBody } from './http-exception.filter';

/**
 * AllExceptionsFilter – A safety-net filter that catches **any** unhandled
 * exception that slips past the `HttpExceptionFilter`.
 *
 * This prevents raw error objects, stack traces, or framework internals
 * from leaking to API consumers. In production it returns a generic
 * `500 Internal Server Error` message while logging the full stack for
 * debugging.
 *
 * Register globally in `main.ts` (**before** `HttpExceptionFilter` so it
 * acts as the outermost catch):
 * ```ts
 * app.useGlobalFilters(
 *   new AllExceptionsFilter(),   // outermost – catches everything
 *   new HttpExceptionFilter(),   // innermost – handles known HTTP errors
 * );
 * ```
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId = (request as any).correlationId as
      | string
      | undefined;

    // Log the full error for internal debugging
    this.logger.error(
      `[${correlationId ?? 'N/A'}] Unhandled exception on ${request.method} ${request.originalUrl}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const body: ErrorResponseBody = {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'InternalServerError',
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
