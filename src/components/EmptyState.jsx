import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function EmptyState({ title = 'No results found', message = 'There is nothing to display right now.', icon: Icon = HelpCircle }) {
  return (
    <div className="glass-card rounded-3xl p-10 border border-slate-100 dark:border-slate-800/50 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
        <Icon size={32} className="stroke-1" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-slate-850 dark:text-slate-200 text-base">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">{message}</p>
      </div>
    </div>
  );
}
