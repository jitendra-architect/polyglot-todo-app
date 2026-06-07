import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Todo } from '../types/todo';
import { StatusBadge } from './StatusBadge';
import { PriorityDots } from './PriorityDots';

interface Props {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  isDeleting?: boolean;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPastDue(dateStr?: string, status?: string) {
  if (!dateStr || status === 'done') return false;
  return new Date(dateStr) < new Date();
}

export function TodoCard({ todo, onEdit, onDelete, isDeleting }: Props) {
  const pastDue = isPastDue(todo.dueDate, todo.status);
  const formattedDate = formatDate(todo.dueDate);

  return (
    <article
      className={clsx(
        'group relative flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        todo.status === 'done' && 'opacity-70',
        isDeleting && 'pointer-events-none opacity-40',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3
          className={clsx(
            'text-base font-semibold leading-snug text-slate-800',
            todo.status === 'done' && 'line-through text-slate-400',
          )}
        >
          {todo.title}
        </h3>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(todo)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Edit todo"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(todo)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            aria-label="Delete todo"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Description */}
      {todo.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{todo.description}</p>
      )}

      {/* Footer */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={todo.status} />
          <PriorityDots value={todo.priority} />
        </div>

        {formattedDate && (
          <span
            className={clsx(
              'flex items-center gap-1 text-xs font-medium',
              pastDue ? 'text-red-500' : 'text-slate-400',
            )}
          >
            <CalendarDays size={12} />
            {formattedDate}
            {pastDue && <span className="text-red-400">(overdue)</span>}
          </span>
        )}
      </div>
    </article>
  );
}
