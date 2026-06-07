import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

interface TodoCreatedPayload {
  id: string;
  title: string;
}

@Injectable()
export class TodoQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TodoQueueService.name);
  private queue?: Queue;
  private worker?: Worker;
  private events?: QueueEvents;
  private enabled: boolean;
  private connection?: IORedis;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('redis.enabled', false);
    if (this.enabled) {
      const url = this.config.get<string>('redis.url', '');
      this.connection = url
        ? new IORedis(url)
        : new IORedis({ host: this.config.get('redis.host'), port: this.config.get('redis.port') });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled || !this.connection) {
      this.logger.log('Jobs disabled (Redis off)');
      return;
    }
    this.queue = new Queue('todo_events', { connection: this.connection });
    this.events = new QueueEvents('todo_events', { connection: this.connection });
    this.worker = new Worker<TodoCreatedPayload>(
      'todo_events',
      async (job) => {
        if (job.name === 'todo_created') {
          this.logger.log(`Processed job: todo_created id=${job.data.id} title=${job.data.title}`);
        }
      },
      { connection: this.connection }
    );
    this.logger.log('Jobs enabled');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.events?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueueTodoCreated(todo: TodoCreatedPayload): Promise<void> {
    if (!this.queue) return;
    const opts: JobsOptions = { removeOnComplete: 50, removeOnFail: 50 };
    await this.queue.add('todo_created', todo, opts);
  }
}
