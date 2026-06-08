import { Body, Controller, Get, Param, Post, Query, Render, Res } from '@nestjs/common';
import { Response } from 'express';

import { TodosService } from '../services/todos.service';
import { ListTodosQueryDto } from '../dtos/list-todos.dto';
import { CreateTodoDto } from '../dtos/create-todo.dto';
import { UpdateTodoDto } from '../dtos/update-todo.dto';

@Controller()
export class TodosViewController {
  constructor(private readonly todos: TodosService) {}

  @Get('/')
  async homeRedirect(@Res() res: Response) {
    return res.redirect('/todos');
  }

  @Get('/todos')
  @Render('todos/index')
  async index(@Query() query: ListTodosQueryDto) {
    const data = await this.todos.findAll(query);
    const pages = Math.ceil(data.total / data.limit);
    return {
      title: 'Todos',
      items: data.items,
      page: data.page,
      limit: data.limit,
      total: data.total,
      pages,
      status: query.status ?? '',
    };
  }

  @Get('/todos/new')
  @Render('todos/form')
  newTodo() {
    return { title: 'Create Todo', mode: 'create', todo: {}, errors: null };
  }

  @Get('/todos/:id')
  @Render('todos/detail')
  async detail(@Param('id') id: string) {
    const todo = await this.todos.findOne(id);
    return { title: todo.title, todo };
  }

  @Get('/todos/:id/edit')
  @Render('todos/form')
  async edit(@Param('id') id: string) {
    const todo = await this.todos.findOne(id);
    return { title: `Edit: ${todo.title}`, mode: 'edit', todo, errors: null };
  }

  // SSR form submissions
  @Post('/todos')
  async create(@Body() body: CreateTodoDto, @Res() res: Response) {
    const created = await this.todos.create(body);
    return res.redirect(`/todos/${created._id.toString()}`);
  }

  @Post('/todos/:id/update')
  async update(@Param('id') id: string, @Body() body: UpdateTodoDto, @Res() res: Response) {
    await this.todos.update(id, body);
    return res.redirect(`/todos/${id}`);
  }

  @Post('/todos/:id/delete')
  async remove(@Param('id') id: string, @Res() res: Response) {
    await this.todos.remove(id);
    return res.redirect('/todos');
  }
}
