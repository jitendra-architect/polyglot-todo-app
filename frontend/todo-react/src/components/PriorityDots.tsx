import { clsx } from 'clsx';

interface Props {
  value: number;
}

const colorByPriority = (p: number, idx: number) => {
  if (idx >= p) return 'bg-slate-200';
  if (p >= 4) return 'bg-red-500';
  if (p === 3) return 'bg-amber-400';
  return 'bg-emerald-500';
};

export function PriorityDots({ value }: Props) {
  return (
    <span className="flex items-center gap-0.5" title={`Priority ${value}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={clsx('inline-block h-2 w-2 rounded-full', colorByPriority(value, i))}
        />
      ))}
    </span>
  );
}
