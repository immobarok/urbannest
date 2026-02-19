import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully!!😁😁😁');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database disconnected successfully!!😁😁😁');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Cleaning the database is not allowed in production environment!',
      );
    }
    const models = Reflect.ownKeys(this).filter(
      (key) =>
        typeof key === 'string' &&
        !key.startsWith('_') &&
        typeof this[key] === 'object',
    );

    return Promise.all(
      models.map((modelKey) => {
        if (typeof modelKey === 'string') {
          return this[modelKey].deleteMany();
        }
      }),
    );
  }
}
