import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * RequestLoggerMiddleware – Lightweight HTTP request/response logger
 * that runs at the middleware layer (before guards and interceptors).
 *
 * Logs:
 * - Incoming: method, URL, content-type, content-length
 * - Outgoing: status code and total response time
 *
 * This complements `LoggingInterceptor` by capturing timing from the
 * very first moment the request enters the middleware pipeline, which
 * includes time spent in guards and pipes that interceptors cannot see.
 *
 * Register in your module:
 * ```ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(RequestLoggerMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const contentType = req.get('content-type') ?? '-';
    const contentLength = req.get('content-length') ?? '-';
    const startTime = Date.now();

    this.logger.log(
      `→ ${method} ${originalUrl} | Content-Type: ${contentType} | Content-Length: ${contentLength}`,
    );

    // Hook into the response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      this.logger.log(
        `← ${method} ${originalUrl} ${statusCode} | ${duration}ms`,
      );
    });

    next();
  }
}
