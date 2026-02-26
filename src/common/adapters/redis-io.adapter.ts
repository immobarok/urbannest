import { IoAdapter } from "@nestjs/platform-socket.io";
import { Server, ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export class RedisIoAdapter extends IoAdapter {
	private adapterConstructor!: ReturnType<typeof createAdapter>;

	async connectToRedis(): Promise<void> {
		const pubClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
		const subClient = pubClient.duplicate();

		await Promise.all([pubClient.connect(), subClient.connect()]);

		this.adapterConstructor = createAdapter(pubClient, subClient);
	}

	override createIOServer(port: number, options?: ServerOptions): Server {
		const server: Server = super.createIOServer(port, options) as Server;
		server.adapter(this.adapterConstructor);
		return server;
	}
}
