import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn
} from 'typeorm';
import { TodoStatus } from '../schemas/todo.schema';

@Entity('todos')
@Index(['status', 'dueDate'])
export class TodoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'due_date', nullable: true })
  dueDate?: Date;

  @Column({ type: 'varchar', default: 'todo' })
  status!: TodoStatus;

  @Column({ default: 3 })
  priority!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @VersionColumn({ name: 'version' })
  __v!: number;
}
