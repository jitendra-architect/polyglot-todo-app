import { ITodo } from '../schemas/todo.model';
import { ListTodosQuery } from '../validators/todo.validators';

export interface TodoListResult {
  items: ITodo[];
  total: number;
  page: number;
  limit: number;
}

export interface ITodosRepository {
  create(data: Partial<ITodo>): Promise<ITodo>;
  findAll(query: ListTodosQuery): Promise<TodoListResult>;
  findByIdLean(id: string): Promise<ITodo | null>;
  /**
   * Find by id, apply patches, save atomically.
   * Throws NotFoundError if id not found.
   * Throws ConflictError on OCC version mismatch when expectedVersion is provided.
   */
  updateById(id: string, patches: Partial<ITodo>, expectedVersion?: number): Promise<ITodo>;
  deleteById(id: string): Promise<ITodo | null>;
}
