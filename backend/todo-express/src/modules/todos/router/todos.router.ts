import { Router, Request, Response, NextFunction } from 'express';
import { TodosService } from '../service/todos.service';
import { CacheService } from '../../../services/cache.service';
import { validate } from '../../../common/middleware/validate.middleware';
import {
  createTodoSchema,
  updateTodoSchema,
  listTodosQuerySchema,
  idParamSchema,
  ListTodosQuery,
  CreateTodoInput,
  UpdateTodoInput,
} from '../validators/todo.validators';

export function makeTodosRouter(todos: TodosService, cache: CacheService): Router {
  const router = Router();

  // GET /api/todos
  router.get(
    '/',
    validate(listTodosQuerySchema, 'query'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // req.query is read-only in Express 5; read coerced values from res.locals
        const query = (res.locals['validated']?.['query'] ?? req.query) as ListTodosQuery;
        const key = `todos:list:page:${query.page}:limit:${query.limit}:status:${query.status ?? 'all'}`;
        const cached = await cache.get(key);
        if (cached) {
          res.json(cached);
          return;
        }
        const result = await todos.findAll(query);
        await cache.set(key, result);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/todos/:id
  router.get(
    '/:id',
    validate(idParamSchema, 'params'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const todo = await todos.findOne(String(req.params['id']));
        res.json(todo);
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/todos
  router.post(
    '/',
    validate(createTodoSchema, 'body'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const todo = await todos.create(req.body as CreateTodoInput);
        await cache.scanDel('todos:list:*');
        res.status(201).json(todo);
      } catch (err) {
        next(err);
      }
    },
  );

  // PUT /api/todos/:id
  router.put(
    '/:id',
    validate(idParamSchema, 'params'),
    validate(updateTodoSchema, 'body'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const todo = await todos.update(String(req.params['id']), req.body as UpdateTodoInput);
        await cache.scanDel('todos:list:*');
        res.json(todo);
      } catch (err) {
        next(err);
      }
    },
  );

  // DELETE /api/todos/:id
  router.delete(
    '/:id',
    validate(idParamSchema, 'params'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await todos.remove(String(req.params['id']));
        await cache.scanDel('todos:list:*');
        res.json({ status: 'ok' });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
