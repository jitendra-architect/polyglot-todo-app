import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Todo, TodoDocument, TodoStatus } from '../schemas/todo.schema';
import { CreateTodoDto } from '../dtos/create-todo.dto';
import { UpdateTodoDto } from '../dtos/update-todo.dto';
import { ListTodosQueryDto } from '../dtos/list-todos.dto';
import { TodoListResult, TodoResponse } from '../interfaces/todo-response.interface';
import { ITodosRepository } from './todos-repository.interface';

@Injectable()
export class MongoTodosRepository implements ITodosRepository {
  constructor(
    @InjectModel(Todo.name) private readonly model: Model<TodoDocument>
  ) {}

  async create(dto: CreateTodoDto): Promise<TodoResponse> {
    const data: Partial<Todo> = {
      title: dto.title,
      description: dto.description,
      status: dto.status ?? TodoStatus.TODO,
      priority: dto.priority ?? 3,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined
    };
    const created = new this.model(data);
    const saved = await created.save();
    return saved.toObject() as unknown as TodoResponse;
  }

  async findAll(query: ListTodosQueryDto): Promise<TodoListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filter: { status?: TodoStatus } = {};
    if (query.status) {
      filter.status = query.status;
    }
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec()
    ]);
    return { items: items as unknown as TodoResponse[], total, page, limit };
  }

  async findOne(id: string): Promise<TodoResponse | null> {
    const doc: TodoResponse | null = (await this.model.findById(id).lean().exec()) as TodoResponse | null;
    return doc;
  }

  async update(id: string, dto: UpdateTodoDto): Promise<TodoResponse> {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Todo not found');

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.dueDate !== undefined) doc.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    if (dto.__v !== undefined) {
      doc.__v = dto.__v;
    }

    try {
      const saved = await doc.save();
      return saved.toObject() as unknown as TodoResponse;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'VersionError') {
        throw new ConflictException('Version conflict. Please reload and try again.');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const res = await this.model.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Todo not found');
  }
}
