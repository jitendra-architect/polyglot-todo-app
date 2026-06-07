import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redisEnabled: boolean;
  private readonly ttlSeconds: number;
  private redis?: Redis;
  private memory = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly config: ConfigService) {
    this.redisEnabled = this.config.get<boolean>('redis.enabled', false);
    this.ttlSeconds = this.config.get<number>('cache.ttlSeconds', 30);
    if (this.redisEnabled) {
      const url = this.config.get<string>('redis.url', '');
      if (url) {
        this.redis = new Redis(url);
      } else {
        const host = this.config.get<string>('redis.host', '127.0.0.1');
        const port = this.config.get<number>('redis.port', 6379);
        const options: RedisOptions = { host, port };
        this.redis = new Redis(options);
      }
      this.logger.log('Redis cache enabled');
    } else {
      this.logger.log('Redis cache disabled; using in-memory shim');
    }
  }

  enabled(): boolean {
    return this.redisEnabled;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const item = this.memory.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(item.value) as T;
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.ttlSeconds;
    const serialized = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, serialized, 'EX', ttl);
      return;
    }
    this.memory.set(key, { value: serialized, expiresAt: Date.now() + ttl * 1000 });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }
    this.memory.delete(key);
  }

  async scanDel(pattern: string): Promise<number> {
    if (this.redis) {
      let cursor = '0';
      let total = 0;
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) {
          total += await this.redis.del(...keys);
        }
      } while (cursor !== '0');
      return total;
    }
    let count = 0;
    for (const key of this.memory.keys()) {
      if (this.matchPattern(key, pattern)) {
        this.memory.delete(key);
        count++;
      }
    }
    return count;
  }

  async ping(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const res = await this.redis.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  private matchPattern(key: string, pattern: string): boolean {
    // very simple glob-style matcher for '*'
    const regex = new RegExp('^' + pattern.split('*').map(this.escapeRegex).join('.*') + '$');
    return regex.test(key);
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
