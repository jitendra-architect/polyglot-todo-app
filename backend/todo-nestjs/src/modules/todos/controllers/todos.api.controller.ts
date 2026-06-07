import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query
} from '@nestjs/common';

import { TodosService } from '../services/todos.service';
import { CreateTodoDto } from '../dtos/create-todo.dto';
import { UpdateTodoDto } from '../dtos/update-todo.dto';
import { ListTodosQueryDto } from '../dtos/list-todos.dto';
import { CacheService } from '../../../services/cache.service';
import { DeleteResult, TodoListResult, TodoResponse } from '../interfaces/todo-response.interface';

@Controller('api/todos')
export class TodosApiController {
  constructor(private readonly todos: TodosService, private readonly cache: CacheService) {}

  @Get()
  async list(@Query() query: ListTodosQueryDto): Promise<TodoListResult> {
    const key = `todos:list:page:${query.page ?? 1}:limit:${query.limit ?? 10}:status:${query.status ?? 'all'}`;
    const cached = await this.cache.get<TodoListResult>(key);
    if (cached) return cached;
    const result = await this.todos.findAll(query);
    await this.cache.set(key, result);
    return result;
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<TodoResponse> {
    return this.todos.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTodoDto): Promise<TodoResponse> {
    const item = await this.todos.create(dto);
    await this.cache.scanDel('todos:list:*');
    return item;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTodoDto): Promise<TodoResponse> {
    const item = await this.todos.update(id, dto);
    await this.cache.scanDel('todos:list:*');
    return item;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<DeleteResult> {
    await this.todos.remove(id);
    await this.cache.scanDel('todos:list:*');
    return { status: 'ok' };
  }
}
