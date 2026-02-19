import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * HelmetHeadersMiddleware – Sets essential HTTP security headers on every
 * response without requiring the `helmet` npm package.
 *
 * Headers applied:
 * | Header | Purpose |
 * |--------|---------|
 * | `X-Content-Type-Options: nosniff` | Prevents MIME-type sniffing |
 * | `X-Frame-Options: SAMEORIGIN` | Prevents clickjacking |
 * | `X-XSS-Protection: 0` | Disables legacy XSS auditor (modern CSP preferred) |
 * | `Strict-Transport-Security` | Enforces HTTPS for 1 year |
 * | `Referrer-Policy: strict-origin-when-cross-origin` | Controls referrer leakage |
 * | `Permissions-Policy` | Restricts browser feature access |
 *
 * For production, consider migrating to the full `helmet` package for
 * CSP and other advanced policies.
 *
 * Register in your module:
 * ```ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(HelmetHeadersMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class HelmetHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    next();
  }
}
