import Redis, { RedisOptions } from 'ioredis';
import { Config } from '../config/configuration';
import { logger } from '../common/logger';

export class CacheService {
  private readonly redisEnabled: boolean;
  private readonly ttlSeconds: number;
  private redis?: Redis;
  private readonly memory = new Map<string, { value: string; expiresAt: number }>();

  constructor(cfg: Config) {
    this.redisEnabled = cfg.redis.enabled;
    this.ttlSeconds = cfg.cache.ttlSeconds;

    if (this.redisEnabled) {
      if (cfg.redis.url) {
        this.redis = new Redis(cfg.redis.url);
      } else {
        const options: RedisOptions = { host: cfg.redis.host, port: cfg.redis.port };
        this.redis = new Redis(options);
      }
      this.redis.on('error', (err) => logger.error('Redis error', { err }));
      logger.info('Redis cache enabled');
    } else {
      logger.info('Redis cache disabled — using in-memory shim');
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
      if (matchGlob(key, pattern)) {
        this.memory.delete(key);
        count++;
      }
    }
    return count;
  }

  async ping(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async quit(): Promise<void> {
    if (this.redis) await this.redis.quit();
  }
}

function matchGlob(key: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$',
  );
  return regex.test(key);
}
