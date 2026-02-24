import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import {
	LoggingInterceptor,
	TimeoutInterceptor,
	TransformInterceptor,
	ErrorInterceptor,
	PerformanceInterceptor,
} from "./common/interceptors";
import { CorrelationIdMiddleware, HelmetHeadersMiddleware } from "./common/middleware";

import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { MediaModule } from "./media/media.module";
import { MinioModule } from "./minio/minio.module";
import { ListingModule } from "./listing/listing.module";
import { BrandsModule } from "./brands/brands.module";
import { FaqsModule } from "./faqs/faqs.module";
import { HowitworksModule } from "./howitworks/howitworks.module";
import { ContactModule } from "./contact/contact.module";
import { BlogModule } from "./blog/blog.module";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PrismaModule,
		AuthModule,
		RedisModule,
		MailModule,
		MinioModule,
		MediaModule,
		ListingModule,
		BrandsModule,
		FaqsModule,
		HowitworksModule,
		ContactModule,
		BlogModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		// --- Global Guards (JwtAuth first, then Roles) ---
		{ provide: APP_GUARD, useClass: JwtAuthGuard },
		{ provide: APP_GUARD, useClass: RolesGuard },
		// --- Global Interceptors (order matters – first registered = outermost) ---
		{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: PerformanceInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: ErrorInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CorrelationIdMiddleware, HelmetHeadersMiddleware).forRoutes("*");
	}
}
