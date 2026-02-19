import { SetMetadata } from '@nestjs/common';

/**
 * Additional options for the audit log entry.
 */
export interface AuditLogOptions {
  /** The domain resource being acted upon (e.g. `'User'`, `'Order'`). */
  resource?: string;

  /**
   * Whether to capture the request body in the audit log.
   * Defaults to `false` to avoid logging sensitive payloads.
   */
  captureBody?: boolean;

  /**
   * Whether to capture the response data in the audit log.
   * Defaults to `false`.
   */
  captureResponse?: boolean;
}

/**
 * The full metadata shape stored under `AUDIT_LOG_KEY`.
 */
export interface AuditLogMetadata extends AuditLogOptions {
  /** A human-readable action name (e.g. `'USER_CREATED'`, `'ORDER_CANCELLED'`). */
  action: string;
}

/** Metadata key consumed by an audit-logging interceptor. */
export const AUDIT_LOG_KEY = 'audit-log';

/**
 * Marks a route handler for **automatic audit logging**.
 *
 * A companion `AuditLogInterceptor` should read the `AUDIT_LOG_KEY` metadata
 * via `Reflector` and, after the handler completes, persist an audit trail
 * entry containing the action, resource, authenticated user, timestamp,
 * and optionally the request body and response.
 *
 * @param action  - A unique, uppercase action identifier (e.g. `'USER_DELETED'`).
 * @param options - Optional resource name and payload capture flags.
 *
 * @example
 * ```ts
 * // Basic audit entry
 * @LogAction('USER_CREATED')
 * @Post()
 * create(@Body() dto: CreateUserDto) { ... }
 *
 * // With resource and body capture
 * @LogAction('ORDER_CANCELLED', { resource: 'Order', captureBody: true })
 * @Patch(':id/cancel')
 * cancelOrder(@Param('id') id: string) { ... }
 *
 * // Full capture for compliance-critical operations
 * @LogAction('PAYMENT_PROCESSED', {
 *   resource: 'Payment',
 *   captureBody: true,
 *   captureResponse: true,
 * })
 * @Post('pay')
 * processPayment(@Body() dto: PaymentDto) { ... }
 * ```
 */
export const LogAction = (action: string, options?: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, {
    action,
    resource: options?.resource,
    captureBody: options?.captureBody ?? false,
    captureResponse: options?.captureResponse ?? false,
  } satisfies AuditLogMetadata);
