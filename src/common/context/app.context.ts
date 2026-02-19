import { Injectable, Logger } from '@nestjs/common';

// ──────────────────────────────────────────────────────────────
// App Context — Application-level singleton metadata
// ──────────────────────────────────────────────────────────────

/**
 * Supported runtime environments.
 *
 * Used by {@link AppContext} to expose a typed `environment` field
 * rather than raw strings scattered across the codebase.
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * AppContext — Injectable singleton that holds environment-resolved
 * application metadata.
 *
 * Instead of scattering `process.env.*` reads across services this
 * class resolves every value **once** at bootstrap and exposes typed,
 * readonly properties that can be injected wherever needed.
 *
 * Register this provider in your root module:
 *
 * ```ts
 * @Module({
 *   providers: [AppContext],
 *   exports: [AppContext],
 * })
 * export class CommonModule {}
 * ```
 *
 * @example
 * ```ts
 * @Injectable()
 * export class HealthService {
 *   constructor(private readonly appCtx: AppContext) {}
 *
 *   check() {
 *     return {
 *       app: this.appCtx.appName,
 *       version: this.appCtx.version,
 *       env: this.appCtx.environment,
 *       uptime: this.appCtx.uptimeSeconds,
 *     };
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Conditional logic based on environment
 * if (this.appCtx.isProduction) {
 *   // enable strict rate-limiting
 * }
 * ```
 */
@Injectable()
export class AppContext {
  private readonly logger = new Logger(AppContext.name);
  private readonly bootTime = Date.now();

  /** Human-readable application name (env: `APP_NAME`). */
  readonly appName: string;

  /** Semantic version string (env: `APP_VERSION`). */
  readonly version: string;

  /** Resolved runtime environment. */
  readonly environment: Environment;

  /** Deployment region / data-centre identifier (env: `APP_REGION`). */
  readonly region: string;

  /** Unique identifier for this running instance (env: `INSTANCE_ID`). */
  readonly instanceId: string;

  constructor() {
    this.appName = process.env.APP_NAME ?? 'nest-api';
    this.version = process.env.APP_VERSION ?? '0.0.0';
    this.environment = this.resolveEnvironment(process.env.NODE_ENV);
    this.region = process.env.APP_REGION ?? 'local';
    this.instanceId =
      process.env.INSTANCE_ID ?? `local-${Date.now().toString(36)}`;

    this.logger.log(
      `Booted ${this.appName}@${this.version} [${this.environment}] region=${this.region} instance=${this.instanceId}`,
    );
  }

  // ── Convenience getters ────────────────────────────────────

  /** `true` when running in {@link Environment.PRODUCTION}. */
  get isProduction(): boolean {
    return this.environment === Environment.PRODUCTION;
  }

  /** `true` when running in {@link Environment.DEVELOPMENT}. */
  get isDevelopment(): boolean {
    return this.environment === Environment.DEVELOPMENT;
  }

  /** `true` when running in {@link Environment.TEST}. */
  get isTest(): boolean {
    return this.environment === Environment.TEST;
  }

  /** Seconds elapsed since this instance was created. */
  get uptimeSeconds(): number {
    return Math.floor((Date.now() - this.bootTime) / 1000);
  }

  // ── Internals ──────────────────────────────────────────────

  private resolveEnvironment(raw?: string): Environment {
    const normalised = (raw ?? 'development').toLowerCase().trim();

    const map: Record<string, Environment> = {
      production: Environment.PRODUCTION,
      prod: Environment.PRODUCTION,
      staging: Environment.STAGING,
      stg: Environment.STAGING,
      test: Environment.TEST,
      development: Environment.DEVELOPMENT,
      dev: Environment.DEVELOPMENT,
    };

    return map[normalised] ?? Environment.DEVELOPMENT;
  }
}
