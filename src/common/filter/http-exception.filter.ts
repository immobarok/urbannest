import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Standard error response shape returned by all exception filters.
 */
export interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
  correlationId?: string;
}

/**
 * HttpExceptionFilter – Catches all `HttpException` instances and returns
 * a consistent, client-safe JSON envelope.
 *
 * This filter normalises the various shapes a NestJS `HttpException` response
 * can take (string, object, array of validation messages) into a single
 * predictable format that matches the project's `ApiErrorResponse` contract.
 *
 * Register globally in `main.ts`:
 * ```ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 * ```
 *
 * Or via the DI container in `AppModule`:
 * ```ts
 * { provide: APP_FILTER, useClass: HttpExceptionFilter }
 * ```
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const correlationId = (request as any).correlationId as
      | string
      | undefined;

    // Normalise the message regardless of how the exception was constructed
    let message: string;
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const msg = (exceptionResponse as any).message;
      message = Array.isArray(msg) ? msg.join('; ') : (msg ?? exception.message);
    } else {
      message = exception.message;
    }

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      message,
      error: exception.name,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };

    this.logger.warn(
      `[${correlationId ?? 'N/A'}] ${request.method} ${request.originalUrl} → ${statusCode} ${message}`,
    );

    response.status(statusCode).json(body);
  }
}
