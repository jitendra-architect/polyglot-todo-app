import { clsx } from 'clsx';
import type { TodoStatus } from '../types/todo';

const config: Record<TodoStatus, { label: string; classes: string }> = {
  todo: { label: 'To Do', classes: 'bg-slate-100 text-slate-600 ring-slate-200' },
  doing: { label: 'Doing', classes: 'bg-blue-50 text-blue-700 ring-blue-200' },
  done: { label: 'Done', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

interface Props {
  status: TodoStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const { label, classes } = config[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        classes,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      )}
    >
      {label}
    </span>
  );
}
