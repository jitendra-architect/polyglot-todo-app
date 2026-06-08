import { Request, Response, NextFunction } from "express";
import { TodosService } from "../service/todos.service";
import { CacheService } from "../../../services/cache.service";
import {
  ListTodosQuery,
  CreateTodoInput,
  UpdateTodoInput,
} from "../validators/todo.validators";

export class TodosController {
  constructor(
    private readonly todos: TodosService,
    private readonly cache: CacheService,
  ) {}

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // req.query is read-only in Express 5; read coerced values from res.locals
      const query = (res.locals["validated"]?.["query"] ??
        req.query) as ListTodosQuery;
      const key = `todos:list:page:${query.page}:limit:${query.limit}:status:${query.status ?? "all"}`;
      const cached = await this.cache.get(key);
      if (cached) {
        res.json(cached);
        return;
      }
      const result = await this.todos.findAll(query);
      await this.cache.set(key, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getOne = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const todo = await this.todos.findOne(String(req.params["id"]));
      res.json(todo);
    } catch (err) {
      next(err);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const todo = await this.todos.create(req.body as CreateTodoInput);
      await this.cache.scanDel("todos:list:*");
      res.status(201).json(todo);
    } catch (err) {
      next(err);
    }
  };

  update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const todo = await this.todos.update(
        String(req.params["id"]),
        req.body as UpdateTodoInput,
      );
      await this.cache.scanDel("todos:list:*");
      res.json(todo);
    } catch (err) {
      next(err);
    }
  };

  remove = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.todos.remove(String(req.params["id"]));
      await this.cache.scanDel("todos:list:*");
      res.json({ status: "ok" });
    } catch (err) {
      next(err);
    }
  };
}
