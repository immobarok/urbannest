import {
  HttpStatus,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Configuration for the `JsonBodyValidatorMiddleware`.
 */
const MAX_BODY_SIZE_BYTES = 1_048_576; // 1 MB

/**
 * JsonBodyValidatorMiddleware – Validates incoming JSON request bodies
 * before they reach the route handler.
 *
 * Checks:
 * 1. The `Content-Type` header is `application/json` for non-GET/HEAD/OPTIONS
 *    requests that have a body.
 * 2. The body size does not exceed the configured maximum (default 1 MB).
 *
 * This provides an early exit with a clear error message, avoiding confusing
 * downstream parse errors.
 *
 * Register in your module:
 * ```ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(JsonBodyValidatorMiddleware)
 *       .forRoutes({ path: '*', method: RequestMethod.ALL });
 *   }
 * }
 * ```
 */
@Injectable()
export class JsonBodyValidatorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JsonBodyValidatorMiddleware.name);

  /** HTTP methods that typically do NOT carry a request body. */
  private readonly bodylessMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip methods that don't send bodies
    if (this.bodylessMethods.has(req.method)) {
      return next();
    }

    const contentLength = parseInt(req.get('content-length') ?? '0', 10);

    // Reject oversized payloads early
    if (contentLength > MAX_BODY_SIZE_BYTES) {
      this.logger.warn(
        `Rejected oversized payload: ${req.method} ${req.originalUrl} (${contentLength} bytes)`,
      );

      res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: `Request body exceeds the maximum allowed size of ${MAX_BODY_SIZE_BYTES} bytes`,
        error: 'PayloadTooLarge',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Ensure Content-Type is JSON when a body is present
    if (contentLength > 0) {
      const contentType = req.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        this.logger.warn(
          `Rejected non-JSON content-type: ${req.method} ${req.originalUrl} (${contentType})`,
        );

        res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).json({
          success: false,
          statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          message: 'Content-Type must be application/json',
          error: 'UnsupportedMediaType',
          path: req.originalUrl,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    next();
  }
}
