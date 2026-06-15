import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="glass-card rounded-3xl p-5 border border-slate-100 dark:border-slate-800/50 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        
        {/* Author details skeleton */}
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-1/6" />
        </div>
      </div>

      {/* Post body content skeleton */}
      <div className="space-y-2">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6" />
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
      </div>

      {/* Footer action buttons skeleton */}
      <div className="flex gap-6 pt-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-12" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-12" />
      </div>
    </div>
  );
}
