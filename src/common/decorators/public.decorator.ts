import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by authentication guards to identify public routes.
 *
 * @example
 * ```ts
 * // Inside your AuthGuard
 * const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
 *   context.getHandler(),
 *   context.getClass(),
 * ]);
 * if (isPublic) return true;
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as **publicly accessible**, bypassing
 * authentication guards.
 *
 * Use this on endpoints that must be reachable without a valid JWT / session,
 * such as health checks, login, registration, or public content.
 *
 * The decorator sets `IS_PUBLIC_KEY` metadata to `true`. Your global
 * `AuthGuard` should read this key via `Reflector` and skip token validation
 * when it is present.
 *
 * @example
 * ```ts
 * // Single route
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 *
 * // Entire controller
 * @Public()
 * @Controller('auth')
 * export class AuthController { ... }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
