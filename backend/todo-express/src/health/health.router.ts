import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { CacheService } from '../services/cache.service';

export function makeHealthRouter(cache: CacheService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
    const redisUp = await cache.ping();
    res.json({
      status: 'ok',
      mongodb: mongoStatus,
      redis: cache.enabled() ? (redisUp ? 'up' : 'down') : 'disabled',
      uptime: process.uptime(),
    });
  });

  return router;
}
