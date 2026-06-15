import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import usePostStore from '../store/usePostStore';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = usePostStore();
  const [localValue, setLocalValue] = useState(searchQuery);

  // Sync store search value to input
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  // Debounce search query update
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localValue);
    }, 400);

    return () => clearTimeout(timer);
  }, [localValue, setSearchQuery]);

  const handleClear = () => {
    setLocalValue('');
    setSearchQuery('');
  };

  return (
    <div className="relative">
      <Search size={18} className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-600" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Search posts or nicknames..."
        className="w-full pl-12 pr-10 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm shadow-sm"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
