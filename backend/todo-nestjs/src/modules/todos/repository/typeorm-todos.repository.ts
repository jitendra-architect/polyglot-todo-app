import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Types } from 'mongoose';

import { TodoEntity } from '../entities/todo.entity';
import { TodoStatus } from '../schemas/todo.schema';
import { CreateTodoDto } from '../dtos/create-todo.dto';
import { UpdateTodoDto } from '../dtos/update-todo.dto';
import { ListTodosQueryDto } from '../dtos/list-todos.dto';
import { TodoListResult, TodoResponse } from '../interfaces/todo-response.interface';
import { ITodosRepository } from './todos-repository.interface';

@Injectable()
export class TypeOrmTodosRepository implements ITodosRepository {
  constructor(
    @InjectRepository(TodoEntity) private readonly repo: Repository<TodoEntity>
  ) {}

  private toResponse(entity: TodoEntity): TodoResponse {
    return {
      _id: entity.id as unknown as Types.ObjectId,
      title: entity.title,
      description: entity.description,
      dueDate: entity.dueDate,
      status: entity.status,
      priority: entity.priority,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      __v: entity.__v
    };
  }

  async create(dto: CreateTodoDto): Promise<TodoResponse> {
    const entity = this.repo.create({
      title: dto.title,
      description: dto.description,
      status: dto.status ?? TodoStatus.TODO,
      priority: dto.priority ?? 3,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined
    });
    const saved = await this.repo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(query: ListTodosQueryDto): Promise<TodoListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: FindOptionsWhere<TodoEntity> = {};
    if (query.status) {
      where.status = query.status;
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });
    return { items: items.map(e => this.toResponse(e)), total, page, limit };
  }

  async findOne(id: string): Promise<TodoResponse | null> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) return null;
    return this.toResponse(entity);
  }

  async update(id: string, dto: UpdateTodoDto): Promise<TodoResponse> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException('Todo not found');

    if (dto.__v !== undefined && entity.__v !== dto.__v) {
      throw new ConflictException('Version conflict. Please reload and try again.');
    }

    if (dto.title !== undefined) entity.title = dto.title;
    if (dto.description !== undefined) entity.description = dto.description;
    if (dto.priority !== undefined) entity.priority = dto.priority;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.dueDate !== undefined) entity.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    const saved = await this.repo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException('Todo not found');
    await this.repo.remove(entity);
  }
}
