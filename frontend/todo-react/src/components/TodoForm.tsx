import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Todo, TodoStatus } from '../types/todo';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  status: z.enum(['todo', 'doing', 'done']),
  priority: z
    .string()
    .or(z.number())
    .transform((v) => Number(v))
    .pipe(z.number().min(1).max(5)),
});

type FormValues = {
  title: string;
  description?: string;
  dueDate?: string;
  status: 'todo' | 'doing' | 'done';
  priority: number;
};

interface Props {
  todo?: Todo | null;
  onClose: () => void;
  onSubmit: (values: FormValues & { __v?: number }) => void;
  isSubmitting?: boolean;
}

const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
];

function toDateInputValue(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export function TodoForm({ todo, onClose, onSubmit, isSubmitting }: Props) {
  const isEditing = Boolean(todo);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormValues, any, FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      status: 'todo',
      priority: 3,
    },
  });

  useEffect(() => {
    if (todo) {
      reset({
        title: todo.title,
        description: todo.description ?? '',
        dueDate: toDateInputValue(todo.dueDate),
        status: todo.status,
        priority: todo.priority,
      });
    } else {
      reset({ title: '', description: '', dueDate: '', status: 'todo', priority: 3 });
    }
  }, [todo, reset]);

  const submit = (values: FormValues) => {
    const payload: FormValues & { __v?: number } = {
      ...values,
      description: values.description || undefined,
      dueDate: values.dueDate || undefined,
    };
    if (isEditing && todo) payload.__v = todo.__v;
    onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-800">
            {isEditing ? 'Edit Todo' : 'New Todo'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 p-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              {...register('title')}
              placeholder="What needs to be done?"
              className={clsx(
                'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors',
                'placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                errors.title ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
              )}
            />
            <FieldError message={errors.title?.message} />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              placeholder="Add more details..."
              className={clsx(
                'w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors',
                'placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'border-slate-200 bg-white',
              )}
            />
          </div>

          {/* Row: Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                id="status"
                {...register('status')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1">
                Priority (1–5)
              </label>
              <input
                id="priority"
                type="number"
                min={1}
                max={5}
                {...register('priority')}
                className={clsx(
                  'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  errors.priority ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
                )}
              />
              <FieldError message={errors.priority?.message} />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 mb-1">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              {...register('dueDate')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Todo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
