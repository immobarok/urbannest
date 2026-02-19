import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * CorrelationIdMiddleware – Ensures every request carries a unique
 * correlation ID for distributed tracing.
 *
 * If the incoming request already includes an `X-Correlation-Id` header
 * (forwarded by an API gateway or upstream service), that value is reused.
 * Otherwise a new UUIDv4 is generated.
 *
 * The ID is:
 * 1. Attached to `request.correlationId` for downstream consumers.
 * 2. Set as the `X-Correlation-Id` response header so clients can reference it.
 * 3. Logged at debug level for request traceability.
 *
 * Register in your module:
 * ```ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(CorrelationIdMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? uuidv4();

    // Attach to request for downstream access
    (req as any).correlationId = correlationId;

    // Echo back in the response header
    _res.setHeader('X-Correlation-Id', correlationId);

    this.logger.debug(
      `[${correlationId}] ${req.method} ${req.originalUrl}`,
    );

    next();
  }
}
