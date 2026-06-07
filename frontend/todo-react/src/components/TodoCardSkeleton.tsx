export function TodoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="h-4 w-2/3 rounded-full bg-slate-200" />
        <div className="flex gap-1">
          <div className="h-6 w-6 rounded-lg bg-slate-100" />
          <div className="h-6 w-6 rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-3/4 rounded-full bg-slate-100" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 rounded-full bg-slate-100" />
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="h-3 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
