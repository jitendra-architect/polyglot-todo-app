import { z } from 'zod';
import { TodoStatus } from '../schemas/todo.model';

const todoStatusEnum = z.enum([TodoStatus.TODO, TodoStatus.DOING, TodoStatus.DONE]);

// ── Create ───────────────────────────────────────────────────────────────────
export const createTodoSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().or(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use ISO date or datetime').optional(),
  ),
  status: todoStatusEnum.optional().default(TodoStatus.TODO),
  priority: z.number().int().min(1).max(5).optional().default(3),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;

// ── Update ───────────────────────────────────────────────────────────────────
export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    dueDate: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    status: todoStatusEnum.optional(),
    priority: z.number().int().min(1).max(5).optional(),
    // Optimistic concurrency version — must be integer ≥ 0
    __v: z.number().int().min(0).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

// ── List query ───────────────────────────────────────────────────────────────
export const listTodosQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  status: todoStatusEnum.optional(),
});

export type ListTodosQuery = z.infer<typeof listTodosQuerySchema>;

// ── Params ───────────────────────────────────────────────────────────────────
export const idParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});
