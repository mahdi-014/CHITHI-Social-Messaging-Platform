import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'chithi-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  async getReady() {
    let dbStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'pending_or_mock';
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}
