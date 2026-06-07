import { Queue, Worker, QueueEvents, JobsOptions, ConnectionOptions } from 'bullmq';
import { Config } from '../config/configuration';
import { logger } from '../common/logger';

interface TodoCreatedPayload {
  id: string;
  title: string;
}

export class TodoQueueService {
  private queue?: Queue;
  private worker?: Worker;
  private events?: QueueEvents;
  private readonly enabled: boolean;
  private readonly connection?: ConnectionOptions;

  constructor(cfg: Config) {
    this.enabled = cfg.redis.enabled;
    if (this.enabled) {
      // Pass plain connection options so BullMQ uses its own ioredis copy,
      // avoiding duplicate-ioredis type conflicts.
      this.connection = cfg.redis.url
        ? { url: cfg.redis.url }
        : { host: cfg.redis.host, port: cfg.redis.port };
    }
  }

  async start(): Promise<void> {
    if (!this.enabled || !this.connection) {
      logger.info('Jobs disabled (Redis off)');
      return;
    }
    this.queue = new Queue('todo_events', { connection: this.connection });
    this.events = new QueueEvents('todo_events', { connection: this.connection });
    this.worker = new Worker<TodoCreatedPayload>(
      'todo_events',
      async (job) => {
        if (job.name === 'todo_created') {
          logger.info(`Processed job: todo_created id=${job.data.id} title=${job.data.title}`);
        }
      },
      { connection: this.connection },
    );
    logger.info('Jobs enabled');
  }

  async stop(): Promise<void> {
    await this.worker?.close();
    await this.events?.close();
    await this.queue?.close();
  }

  async enqueueTodoCreated(todo: TodoCreatedPayload): Promise<void> {
    if (!this.queue) return;
    const opts: JobsOptions = { removeOnComplete: 50, removeOnFail: 50 };
    await this.queue.add('todo_created', todo, opts);
  }
}
