import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL via Prisma');
    } catch (err: any) {
      this.logger.warn(`Could not connect to PostgreSQL: ${err?.message || err}. Local mock mode or reconnect available.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
