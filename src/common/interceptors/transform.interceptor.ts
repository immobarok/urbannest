import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { Request } from 'express';

/** Metadata key to skip the standard response envelope. */
export const SKIP_TRANSFORM_KEY = 'skip-transform';

/** Metadata key for custom success messages. */
export const RESPONSE_MESSAGE_KEY = 'response-message';

/**
 * Decorator to opt-out of the standard response wrapper on a per-route basis.
 *
 * @example
 * ```ts
 * @SkipTransform()
 * @Get('health')
 * check() { return 'ok'; }
 * ```
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);

/**
 * Decorator to set a custom success message for the response envelope.
 *
 * @example
 * ```ts
 * @ResponseMessage('Listing created successfully')
 * @Post()
 * create() { ... }
 * ```
 */
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);

/**
 * Standard API response envelope.
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
  data: T;
}

/**
 * TransformInterceptor - Wraps every successful response in a consistent
 * JSON envelope so that API consumers always receive a predictable shape.
 *
 * Response shape:
 * ```json
 * {
 *   "success": true,
 *   "statusCode": 200,
 *   "message": "OK",
 *   "path": "/api/users",
 *   "timestamp": "2026-02-14T...",
 *   "data": { ... }
 * }
 * ```
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) { }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const skip = this.reflector.get<boolean>(
      SKIP_TRANSFORM_KEY,
      context.getHandler(),
    );

    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    if (skip) {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        message: customMessage || this.getStatusMessage(response.statusCode),
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
        data,
      })),
    );
  }

  private getStatusMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'Content not found 😥',
    };
    return messages[statusCode] ?? 'Success ';
  }
}
