import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface HealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  version: string;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    let database: HealthResponse['database'] = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    return {
      status: 'ok',
      database,
      version: process.env.APP_VERSION ?? '0.0.1',
      timestamp: new Date().toISOString(),
    };
  }
}
