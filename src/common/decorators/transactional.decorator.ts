import { SetMetadata } from '@nestjs/common';

/**
 * Standard SQL transaction isolation levels.
 *
 * Choose the level that matches your consistency requirements:
 * - `READ_UNCOMMITTED` – fastest, allows dirty reads.
 * - `READ_COMMITTED`   – default in most databases, prevents dirty reads.
 * - `REPEATABLE_READ`  – prevents non-repeatable reads.
 * - `SERIALIZABLE`     – strictest, fully serialised execution.
 */
export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * Configuration for the `@Transactional()` decorator.
 */
export interface TransactionalOptions {
  /**
   * SQL isolation level for the transaction.
   * Defaults to the database's own default (usually `READ_COMMITTED`).
   */
  isolationLevel?: IsolationLevel;

  /**
   * Whether the transaction is read-only.
   * Some databases optimise read-only transactions.
   */
  readOnly?: boolean;
}

/** Metadata key consumed by a transaction interceptor. */
export const TRANSACTIONAL_KEY = 'transactional';

/**
 * Marks a route handler as **transactional**, instructing a companion
 * interceptor to wrap the entire handler execution inside a database
 * transaction.
 *
 * A `TransactionInterceptor` should:
 * 1. Read `TRANSACTIONAL_KEY` metadata via `Reflector`.
 * 2. Begin a transaction with the specified options.
 * 3. Commit on success or rollback on error.
 *
 * @param options - Optional isolation level and read-only flag.
 *
 * @example
 * ```ts
 * // Default isolation level
 * @Transactional()
 * @Post()
 * createOrder(@Body() dto: CreateOrderDto) { ... }
 *
 * // Strict isolation for financial operations
 * @Transactional({ isolationLevel: IsolationLevel.SERIALIZABLE })
 * @Post('transfer')
 * transferFunds(@Body() dto: TransferDto) { ... }
 *
 * // Read-only transaction for analytics
 * @Transactional({ readOnly: true })
 * @Get('report')
 * generateReport() { ... }
 * ```
 */
export const Transactional = (options?: TransactionalOptions) =>
  SetMetadata(TRANSACTIONAL_KEY, {
    isolationLevel: options?.isolationLevel,
    readOnly: options?.readOnly ?? false,
  });
