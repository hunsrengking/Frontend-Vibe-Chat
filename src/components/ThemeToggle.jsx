import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useAuthStore();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-500" />}
    </button>
  );
}
