import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { Request } from 'express';

/**
 * Standard error response shape returned to clients.
 */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
  correlationId?: string;
}

/**
 * ErrorInterceptor - Normalises every exception into a uniform error envelope.
 *
 * - Known `HttpException` errors are forwarded with their original status.
 * - Unknown / unexpected errors are logged with a full stack trace and returned
 *   as 500 Internal Server Error **without leaking implementation details** to
 *   the client.
 * - Attaches the `correlationId` (set by `LoggingInterceptor`) so that errors
 *   can be traced across distributed systems.
 */
@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const httpCtx = context.switchToHttp();
        const request = httpCtx.getRequest<Request>();
        const response = httpCtx.getResponse();
        const correlationId = (request as any).correlationId;

        let statusCode: number;
        let message: string;
        let errorName: string;

        if (error instanceof HttpException) {
          statusCode = error.getStatus();
          const exceptionResponse = error.getResponse();
          message =
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : ((exceptionResponse as any).message ?? error.message);
          errorName = error.name;
        } else {
          // Never leak internal details to the client
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'An unexpected error occurred';
          errorName = 'InternalServerError';

          this.logger.error(
            `[${correlationId ?? 'N/A'}] Unhandled exception on ${request.method} ${request.originalUrl}`,
            error?.stack ?? error,
          );
        }

        // Ensure the HTTP response carries the correct status code
        response.status(statusCode);

        const body: ApiErrorResponse = {
          success: false,
          statusCode,
          message: Array.isArray(message) ? message.join('; ') : message,
          error: errorName,
          path: request.originalUrl,
          timestamp: new Date().toISOString(),
          ...(correlationId && { correlationId }),
        };

        return throwError(() => new HttpException(body, statusCode));
      }),
    );
  }
}
