import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

/**
 * Validates req[target] against the Zod schema.
 *
 * - On success: stores coerced output in res.locals.validated[target]
 *   and also writes back to req.body / req.params (both are writable).
 *   req.query is read-only in Express 5, so it is only stored in res.locals.
 * - On failure: calls next(zodError).
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const source = target === 'body' ? req.body : target === 'query' ? req.query : req.params;
    const result = schema.safeParse(source);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Always keep a validated copy accessible via res.locals
    if (!res.locals['validated']) res.locals['validated'] = {};
    res.locals['validated'][target] = result.data;

    // Write back to mutable properties
    if (target === 'body') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).body = result.data;
    } else if (target === 'params') {
      // req.params values are writable (individual properties on the object)
      Object.assign(req.params, result.data);
    }
    // req.query is a getter in Express 5 — do NOT attempt to reassign it.
    // Callers must read validated query from res.locals.validated.query.
    next();
  };
}
