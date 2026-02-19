import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Custom parameter decorator that extracts the authenticated user object
 * (or a single property of it) from the Express `request.user`.
 *
 * This assumes an upstream authentication guard has already validated the
 * token and attached the decoded payload to `request.user`.
 *
 * @param data - Optional property key to pluck from the user object.
 *               When omitted the entire user object is returned.
 *
 * @example
 * ```ts
 * // Get the full user object
 * @Get('me')
 * getProfile(@CurrentUser() user: UserPayload) {
 *   return user;
 * }
 *
 * // Pluck a single field
 * @Get('my-id')
 * getId(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 *
 * // Use the email directly
 * @Get('my-email')
 * getEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
