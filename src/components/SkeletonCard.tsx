import React from 'react';

export function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#10233F]/55">
      <div className="aspect-[4/3] w-full bg-slate-200 dark:bg-slate-800" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3.5 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-3.5 w-2/3 rounded bg-slate-100 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}
