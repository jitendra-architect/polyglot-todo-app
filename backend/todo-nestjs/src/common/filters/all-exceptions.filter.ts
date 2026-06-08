import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { CorrelatedRequest } from '../interfaces/correlated-request.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CorrelatedRequest>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp ? exception.message : 'Internal server error';
    const path = request.url;
    const correlationId = request.correlationId;
    const stack = exception instanceof Error ? exception.stack : undefined;

    const payload = {
      statusCode: status,
      message,
      path,
      correlationId,
    };

    this.logger.error(`${status} ${message} [${correlationId}] ${path}`, stack);

    if (path.startsWith('/api')) {
      response.status(status).json(payload);
    } else {
      response.status(status).render('error', { title: 'Error', error: payload });
    }
  }
}
