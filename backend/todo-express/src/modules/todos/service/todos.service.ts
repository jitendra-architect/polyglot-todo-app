import { ITodo } from '../schemas/todo.model';
import { TodosRepository, TodoListResult } from '../repository/todos.repository';
import { TodoQueueService } from '../../../services/todo-queue.service';
import { CreateTodoInput, UpdateTodoInput, ListTodosQuery } from '../validators/todo.validators';
import { NotFoundError, ConflictError } from '../../../common/errors/http-error';

export class TodosService {
  constructor(
    private readonly repo: TodosRepository,
    private readonly queue: TodoQueueService,
  ) {}

  async create(input: CreateTodoInput): Promise<ITodo> {
    const doc = await this.repo.create({
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });
    await this.queue.enqueueTodoCreated({ id: doc._id.toString(), title: doc.title });
    return doc.toObject() as ITodo;
  }

  async findAll(query: ListTodosQuery): Promise<TodoListResult> {
    return this.repo.findAll(query);
  }

  async findOne(id: string): Promise<ITodo> {
    const doc = await this.repo.findByIdLean(id);
    if (!doc) throw new NotFoundError('Todo not found');
    return doc;
  }

  async update(id: string, input: UpdateTodoInput): Promise<ITodo> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundError('Todo not found');

    if (input.title !== undefined) doc.title = input.title;
    if (input.description !== undefined) doc.description = input.description;
    if (input.priority !== undefined) doc.priority = input.priority;
    if (input.status !== undefined) doc.status = input.status;
    if (input.dueDate !== undefined) {
      doc.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
    }
    // Optimistic concurrency: inject client version so Mongoose fires VersionError on conflict
    if (input.__v !== undefined) {
      doc.__v = input.__v;
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

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.deleteById(id);
    if (!deleted) throw new NotFoundError('Todo not found');
  }
}
