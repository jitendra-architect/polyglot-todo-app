import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface CorrelatedRequest extends Request {
  correlationId: string;
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = (req.headers['x-request-id'] as string) || undefined;
  const id = existing ?? uuidv4();
  (req as CorrelatedRequest).correlationId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
