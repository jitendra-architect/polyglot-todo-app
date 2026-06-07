import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../errors/http-error';
import { logger } from '../logger';
import { CorrelatedRequest } from './correlation-id.middleware';

// Express 5 error handlers must have exactly 4 params
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = (req as CorrelatedRequest).correlationId;

  if (err instanceof ZodError) {
    const payload = {
      statusCode: 422,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
      path: req.path,
      correlationId,
    };
    logger.warn(`422 Validation [${correlationId}] ${req.path}`);
    res.status(422).json(payload);
    return;
  }

  if (err instanceof HttpError) {
    const payload = {
      statusCode: err.statusCode,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
      path: req.path,
      correlationId,
    };
    logger.warn(`${err.statusCode} ${err.message} [${correlationId}] ${req.path}`);
    res.status(err.statusCode).json(payload);
    return;
  }

  const stack = err instanceof Error ? err.stack : String(err);
  logger.error(`500 Internal Server Error [${correlationId}] ${req.path}`, { stack });
  res.status(500).json({
    statusCode: 500,
    message: 'Internal server error',
    path: req.path,
    correlationId,
  });
}
