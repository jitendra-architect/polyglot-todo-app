import { clsx } from 'clsx';
import type { TodoStatus } from '../types/todo';

type Filter = TodoStatus | 'all';

interface Props {
  value: Filter;
  onChange: (v: Filter) => void;
  counts?: Partial<Record<Filter, number>>;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
];

export function TodoFilters({ value, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={clsx(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            value === f.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-800',
          )}
        >
          {f.label}
          {counts?.[f.value] !== undefined && (
            <span
              className={clsx(
                'ml-1.5 rounded-full px-1.5 py-px text-xs font-semibold',
                value === f.value ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500',
              )}
            >
              {counts[f.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
