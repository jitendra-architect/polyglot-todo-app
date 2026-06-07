import { ClipboardList } from 'lucide-react';

interface Props {
  filtered?: boolean;
}

export function EmptyState({ filtered }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <ClipboardList size={32} className="text-slate-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-700">
          {filtered ? 'No todos match this filter' : 'No todos yet'}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {filtered ? 'Try a different status filter.' : 'Click "New Todo" to get started.'}
        </p>
      </div>
    </div>
  );
}
