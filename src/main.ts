import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { HttpExceptionFilter, AllExceptionsFilter } from "./common/filter";
import { RedisIoAdapter } from "./common/adapters/redis-io.adapter";

async function bootstrap() {
	// ── Create Application ─────────────────────────────────────
	const app = await NestFactory.create(AppModule, {
		rawBody: true,
		logger:
			process.env.NODE_ENV === "production"
				? ["error", "warn", "log"]
				: ["error", "warn", "log", "debug", "verbose"],
	});

	const logger = new Logger("Bootstrap");
	const configService = app.get(ConfigService);

	// ── Global Prefix ──────────────────────────────────────────
	app.setGlobalPrefix("api", {
		exclude: [],
	});

	// ── API Versioning ─────────────────────────────────────────
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: "1",
	});

	// ── CORS ───────────────────────────────────────────────────
	const allowedOrigins = configService.get<string>("CORS_ORIGINS", "*");
	app.enableCors({
		origin: allowedOrigins === "*" ? true : allowedOrigins.split(","),
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-Correlation-Id",
			"X-Requested-With",
			"Accept",
		],
		exposedHeaders: ["X-Correlation-Id"],
		credentials: true,
		maxAge: 3600,
	});

	// ── Global Pipes ───────────────────────────────────────────
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);

	// ── Global Filters (outermost → innermost) ─────────────────
	app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

	// ── Graceful Shutdown ──────────────────────────────────────
	app.enableShutdownHooks();

	// ── Trust Proxy (for correct IP behind load-balancers) ─────
	const expressApp = app.getHttpAdapter().getInstance() as import("express").Express;
	expressApp.set("trust proxy", 1);

	// ── Body Size Limits ───────────────────────────────────────
	const bodyLimit = configService.get<string>("BODY_LIMIT", "10mb");
	const { json, urlencoded } = await import("express");
	app.use(
		json({
			limit: bodyLimit,
			verify: (req: any, _res, buf) => {
				// Preserve the raw body for Stripe webhook signature verification
				req.rawBody = buf;
			},
		}),
	);
	app.use(urlencoded({ extended: true, limit: bodyLimit }));

	// ── Redis WebSocket Adapter ──────────────────────────────
	const redisIoAdapter = new RedisIoAdapter(app);
	await redisIoAdapter.connectToRedis();
	app.useWebSocketAdapter(redisIoAdapter);

	// ── Start Server ───────────────────────────────────────────
	const port = configService.get<number>("PORT", 3000);
	const host = configService.get<string>("HOST", "0.0.0.0");

	await app.listen(port, host);

	const url = await app.getUrl();
	logger.log(`🚀 Application running on: ${url}`);
	logger.log(`📄 Environment: ${process.env.NODE_ENV ?? "development"}`);
	logger.log(`🔗 API Base: ${url}/api/v1`);
}

bootstrap().catch((err) => {
	const logger = new Logger("Bootstrap");
	logger.error("❌ Application failed to start", err.stack ?? err);
	process.exit(1);
});
