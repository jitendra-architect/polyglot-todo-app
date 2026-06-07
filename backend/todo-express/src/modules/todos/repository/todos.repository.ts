import { Model, Types } from 'mongoose';
import { ITodo, TodoDocument, TodoModel, TodoStatus } from '../schemas/todo.model';
import { ListTodosQuery } from '../validators/todo.validators';

export interface TodoListResult {
  items: ITodo[];
  total: number;
  page: number;
  limit: number;
}

export class TodosRepository {
  private readonly model: Model<ITodo>;

  constructor(model: Model<ITodo> = TodoModel) {
    this.model = model;
  }

  async create(data: Partial<ITodo>): Promise<TodoDocument> {
    const doc = new this.model(data);
    return doc.save() as Promise<TodoDocument>;
  }

  async findAll(query: ListTodosQuery): Promise<TodoListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filter: { status?: TodoStatus } = {};
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as ITodo[], total, page, limit };
  }

  async findById(id: string): Promise<TodoDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).exec() as Promise<TodoDocument | null>;
  }

  async findByIdLean(id: string): Promise<ITodo | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).lean().exec() as Promise<ITodo | null>;
  }

  async deleteById(id: string): Promise<ITodo | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findByIdAndDelete(id).lean().exec() as Promise<ITodo | null>;
  }
}
