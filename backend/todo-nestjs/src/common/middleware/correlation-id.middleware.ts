import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
    const existing = (req.headers['x-request-id'] as string) || undefined;
    const correlationId = existing || uuidv4();
    (req as any).correlationId = correlationId;
    res.setHeader('X-Request-Id', correlationId);
    next();
  }
}


