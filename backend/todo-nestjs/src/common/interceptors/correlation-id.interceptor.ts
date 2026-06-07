import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';

import { CorrelatedRequest } from '../interfaces/correlated-request.interface';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<CorrelatedRequest>();
    const res = http.getResponse<Response>();
    const id = req.correlationId ?? (req.headers['x-request-id'] as string | undefined);
    if (id) {
      res.setHeader('X-Request-Id', id);
    }
    return next.handle();
  }
}
