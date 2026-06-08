import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { CreateTodoDto } from '../dtos/create-todo.dto';
import { UpdateTodoDto } from '../dtos/update-todo.dto';
import { ListTodosQueryDto } from '../dtos/list-todos.dto';
import { TodoQueueService } from '../../../jobs/todo.queue';
import { TodoListResult, TodoResponse } from '../interfaces/todo-response.interface';
import { ITodosRepository, TODOS_REPOSITORY } from '../repository/todos-repository.interface';

/**
 * Todos Service
 * @description Service for the Todos
 * @category Services
 * @subcategory Todos
 * @module TodosService
 * @author John Doe
 * @version 1.0.0
 */
@Injectable()
export class TodosService {
  constructor(
    @Inject(TODOS_REPOSITORY) private readonly repo: ITodosRepository,
    private readonly todoQueue: TodoQueueService,
  ) {}

  async create(dto: CreateTodoDto): Promise<TodoResponse> {
    const created = await this.repo.create(dto);
    await this.todoQueue.enqueueTodoCreated({ id: created._id.toString(), title: created.title });
    return created;
  }

  async findAll(query: ListTodosQueryDto): Promise<TodoListResult> {
    return this.repo.findAll(query);
  }

  async findOne(id: string): Promise<TodoResponse> {
    const todo = await this.repo.findOne(id);
    if (!todo) throw new NotFoundException('Todo not found');
    return todo;
  }

  async update(id: string, dto: UpdateTodoDto): Promise<TodoResponse> {
    try {
      return await this.repo.update(id, dto);
    } catch (err: unknown) {
      if (err instanceof NotFoundException || err instanceof ConflictException) throw err;
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    return this.repo.remove(id);
  }
}
