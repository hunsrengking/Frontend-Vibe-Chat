import React from 'react';
import { Zap, LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { guest, logout } = useAuthStore();

  return (
    <nav className="glass border-b border-white/20 px-4 sm:px-6 py-3 rounded-2xl mb-5 flex justify-between items-center shadow-sm">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
          <Zap size={15} className="fill-white text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight">
            Vibe<span className="text-indigo-500">Chat</span>
          </span>
          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase">Social</span>
        </div>
      </Link>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {guest && (
          <>
            {/* Avatar → profile page */}
            <NavLink
              to="/profile"
              className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 transition-all"
            >
              <div className="relative">
                <img
                  src={guest.avatar_url}
                  alt="avatar"
                  className="w-7 h-7 rounded-lg object-cover bg-slate-200"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[80px] truncate">
                {guest.nickname}
              </span>
            </NavLink>

            {/* Mobile: avatar only */}
            <Link to="/profile" className="sm:hidden relative">
              <img
                src={guest.avatar_url}
                alt="avatar"
                className="w-8 h-8 rounded-xl object-cover bg-slate-200 border-2 border-white dark:border-slate-700"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </Link>

            {/* Logout */}
            <button
              onClick={logout}
              title="Sign out"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
