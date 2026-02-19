import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  Observable,
  throwError,
  TimeoutError,
  timeout,
  catchError,
} from 'rxjs';

/** Metadata key for per-route timeout override. */
export const TIMEOUT_KEY = 'request-timeout';

/**
 * Decorator to override the default timeout on a per-route basis.
 *
 * @example
 * ```ts
 * @SetTimeout(60_000) // 60 seconds
 * @Get('heavy-report')
 * generateReport() { ... }
 * ```
 */
export const SetTimeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);

/** Default timeout in milliseconds (15 s). */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * TimeoutInterceptor - Enforces a maximum request processing time.
 *
 * Prevents long-running requests from consuming server resources indefinitely.
 * The global default is 15 seconds and can be overridden per-route using
 * the `@SetTimeout()` decorator.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const timeoutMs =
      this.reflector.get<number>(TIMEOUT_KEY, context.getHandler()) ??
      DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          const request = context.switchToHttp().getRequest();
          this.logger.warn(
            `Request to ${request.method} ${request.url} timed out after ${timeoutMs}ms`,
          );
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timed out after ${timeoutMs}ms`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
