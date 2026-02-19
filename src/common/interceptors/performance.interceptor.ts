import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

/** Threshold in ms – requests slower than this get a warning. */
const SLOW_REQUEST_THRESHOLD_MS = 3_000;

/**
 * PerformanceInterceptor - Monitors request latency and flags slow endpoints.
 *
 * Logs a warning whenever a request exceeds a configurable threshold
 * (default 3 s). Useful for identifying bottlenecks before they impact users.
 *
 * In production you would push these metrics to an APM/observability stack
 * (Datadog, New Relic, OpenTelemetry, etc.).
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => this.report(method, originalUrl, start),
        error: () => this.report(method, originalUrl, start),
      }),
    );
  }

  private report(method: string, url: string, start: number): void {
    const duration = Math.round(performance.now() - start);

    if (duration >= SLOW_REQUEST_THRESHOLD_MS) {
      this.logger.warn(
        `🐢 Slow request detected: ${method} ${url} took ${duration}ms (threshold: ${SLOW_REQUEST_THRESHOLD_MS}ms)`,
      );
    }
  }
}
