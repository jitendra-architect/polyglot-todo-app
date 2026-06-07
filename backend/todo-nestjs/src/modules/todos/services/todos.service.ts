import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Todo, TodoDocument, TodoStatus } from '../schemas/todo.schema';
import { CreateTodoDto } from '../dtos/create-todo.dto';
import { UpdateTodoDto } from '../dtos/update-todo.dto';
import { ListTodosQueryDto } from '../dtos/list-todos.dto';
import { TodoQueueService } from '../../../jobs/todo.queue';
import { TodoListResult, TodoResponse } from '../interfaces/todo-response.interface';

@Injectable()
export class TodosService {
  constructor(
    @InjectModel(Todo.name) private readonly todoModel: Model<TodoDocument>,
    private readonly todoQueue: TodoQueueService
  ) {}

  async create(dto: CreateTodoDto): Promise<TodoResponse> {
    const data: Partial<Todo> = {
      title: dto.title,
      description: dto.description,
      status: dto.status ?? TodoStatus.TODO,
      priority: dto.priority ?? 3,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined
    };
    const created = new this.todoModel(data);
    const saved = await created.save();
    await this.todoQueue.enqueueTodoCreated({ id: saved._id.toString(), title: saved.title });
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
      this.todoModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.todoModel.countDocuments(filter).exec()
    ]);
    return { items: items as unknown as TodoResponse[], total, page, limit };
  }

  async findOne(id: string): Promise<TodoResponse> {
    const doc = await this.todoModel.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Todo not found');
    return doc as unknown as TodoResponse;
  }

  async update(id: string, dto: UpdateTodoDto): Promise<TodoResponse> {
    const doc = await this.todoModel.findById(id);
    if (!doc) throw new NotFoundException('Todo not found');

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.dueDate !== undefined) doc.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    if (dto.__v !== undefined) {
      // Set client version on the in-memory document so Mongoose's optimistic
      // concurrency check fires a VersionError if another write won the race.
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
    const res = await this.todoModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Todo not found');
  }
}
