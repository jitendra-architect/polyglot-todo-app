import { Model, Types } from 'mongoose';
import { ITodo, TodoModel } from '../schemas/todo.model';
import { ListTodosQuery } from '../validators/todo.validators';
import { ITodosRepository, TodoListResult } from './todos-repository.interface';
import { ConflictError, NotFoundError } from '../../../common/errors/http-error';

export class MongoTodosRepository implements ITodosRepository {
  private readonly model: Model<ITodo>;

  constructor(model: Model<ITodo> = TodoModel) {
    this.model = model;
  }

  async create(data: Partial<ITodo>): Promise<ITodo> {
    const doc = new this.model(data);
    const saved = await doc.save();
    return saved.toObject() as ITodo;
  }

  async findAll(query: ListTodosQuery): Promise<TodoListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filter: { status?: ITodo['status'] } = {};
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as ITodo[], total, page, limit };
  }

  async findByIdLean(id: string): Promise<ITodo | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).lean().exec() as Promise<ITodo | null>;
  }

  async updateById(id: string, patches: Partial<ITodo>, expectedVersion?: number): Promise<ITodo> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Todo not found');
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundError('Todo not found');

    if (patches.title !== undefined) doc.title = patches.title;
    if (patches.description !== undefined) doc.description = patches.description;
    if (patches.priority !== undefined) doc.priority = patches.priority;
    if (patches.status !== undefined) doc.status = patches.status;
    if (patches.dueDate !== undefined) doc.dueDate = patches.dueDate;

    // Inject client version so Mongoose fires VersionError on conflict
    if (expectedVersion !== undefined) {
      doc.__v = expectedVersion;
    }

    try {
      const saved = await doc.save();
      return saved.toObject() as ITodo;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'VersionError') {
        throw new ConflictError('Version conflict. Please reload and try again.');
      }
      throw err;
    }
  }

  async deleteById(id: string): Promise<ITodo | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findByIdAndDelete(id).lean().exec() as Promise<ITodo | null>;
  }
}
