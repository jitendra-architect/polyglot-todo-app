import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectDataSource } from '@nestjs/typeorm';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';

import { CacheService } from '../services/cache.service';

const dbProfile = process.env.DB_PROFILE ?? 'mongodb';

@Injectable()
export class HealthService {
  constructor(
    private readonly cache: CacheService,
    @Optional() @InjectConnection() private readonly mongoConnection?: Connection,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  async getHealth() {
    const mongodb =
      dbProfile === 'mongodb'
        ? this.mongoConnection?.readyState === 1
          ? 'up'
          : 'down'
        : 'disabled';

    let postgresql: string | undefined;
    if (dbProfile === 'postgresql') {
      try {
        await this.dataSource?.query('SELECT 1');
        postgresql = 'up';
      } catch {
        postgresql = 'down';
      }
    }

    const redisStatus = (await this.cache.ping()) ? 'up' : 'down';

    return {
      status: 'ok',
      mongodb,
      ...(postgresql !== undefined ? { postgresql } : {}),
      redis: this.cache.enabled() ? redisStatus : 'disabled',
      uptime: process.uptime(),
    };
  }
}
