import { ITodo } from '../schemas/todo.model';
import { ITodosRepository, TodoListResult } from '../repository/todos-repository.interface';
import { TodoQueueService } from '../../../services/todo-queue.service';
import { CreateTodoInput, UpdateTodoInput, ListTodosQuery } from '../validators/todo.validators';
import { NotFoundError } from '../../../common/errors/http-error';

export class TodosService {
  constructor(
    private readonly repo: ITodosRepository,
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
    return doc;
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
    const patches: Partial<ITodo> = {};
    if (input.title !== undefined) patches.title = input.title;
    if (input.description !== undefined) patches.description = input.description;
    if (input.priority !== undefined) patches.priority = input.priority;
    if (input.status !== undefined) patches.status = input.status;
    if (input.dueDate !== undefined) patches.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;

    // Delegates OCC (optimistic concurrency) and save to the repository layer
    return this.repo.updateById(id, patches, input.__v);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.deleteById(id);
    if (!deleted) throw new NotFoundError('Todo not found');
  }
}
