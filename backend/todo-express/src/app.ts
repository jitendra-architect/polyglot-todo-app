import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { Config } from './config/configuration';
import { CacheService } from './services/cache.service';
import { TodoQueueService } from './services/todo-queue.service';
import { ITodosRepository } from './modules/todos/repository/todos-repository.interface';
import { TodosService } from './modules/todos/service/todos.service';
import { makeTodosRouter } from './modules/todos/router/todos.router';
import { makeHealthRouter } from './health/health.router';
import { correlationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { errorHandlerMiddleware } from './common/middleware/error-handler.middleware';

export function createApp(cfg: Config, todosRepo: ITodosRepository): {
  app: Express;
  cache: CacheService;
  queue: TodoQueueService;
} {
  const app = express();

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet());

  // ── Body parsing ────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Correlation ID ──────────────────────────────────────────────────────────
  app.use(correlationIdMiddleware);

  // ── Services ─────────────────────────────────────────────────────────────────
  const cache = new CacheService(cfg);
  const queue = new TodoQueueService(cfg);
  const todosService = new TodosService(todosRepo, queue);

  // ── Routes ───────────────────────────────────────────────────────────────────
  app.use('/health', makeHealthRouter(cache));
  app.use('/api/todos', makeTodosRouter(todosService, cache));

  // 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ statusCode: 404, message: 'Route not found' });
  });

  // ── Global error handler ─────────────────────────────────────────────────────
  app.use(errorHandlerMiddleware);

  return { app, cache, queue };
}
