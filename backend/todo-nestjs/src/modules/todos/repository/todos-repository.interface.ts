import { TodoListResult, TodoResponse } from '../interfaces/todo-response.interface';
import { CreateTodoDto } from '../dtos/create-todo.dto';
import { UpdateTodoDto } from '../dtos/update-todo.dto';
import { ListTodosQueryDto } from '../dtos/list-todos.dto';

export const TODOS_REPOSITORY = 'TODOS_REPOSITORY';

export interface ITodosRepository {
  create(dto: CreateTodoDto): Promise<TodoResponse>;
  findAll(query: ListTodosQueryDto): Promise<TodoListResult>;
  findOne(id: string): Promise<TodoResponse | null>;
  update(id: string, dto: UpdateTodoDto): Promise<TodoResponse>;
  remove(id: string): Promise<void>;
}
