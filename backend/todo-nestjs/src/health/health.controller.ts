import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CacheService } from '../services/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async getHealth() {
    const mongoStatus = this.connection.readyState === 1 ? 'up' : 'down';
    const redisStatus = (await this.cache.ping()) ? 'up' : 'down';
    return {
      status: 'ok',
      mongodb: mongoStatus,
      redis: this.cache.enabled() ? redisStatus : 'disabled',
      uptime: process.uptime(),
    };
  }
}
