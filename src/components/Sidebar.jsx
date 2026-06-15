import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Flame, MessageSquare, User, Shield } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function Sidebar() {
  const { guest } = useAuthStore();

  const links = [
    { to: '/',         label: 'Feed',      icon: Home,         exact: true },
    { to: '/trending', label: 'Trending',  icon: Flame },
    { to: '/chat',     label: 'Chat Room', icon: MessageSquare },
    { to: '/profile',  label: 'My Profile',icon: User },
  ];

  if (guest?.is_admin) {
    links.push({ to: '/admin', label: 'Admin Panel', icon: Shield });
  }

  return (
    <aside className="glass rounded-2xl border border-white/20 overflow-hidden h-fit">
      {/* User card */}
      {guest && (
        <div className="px-4 py-4 border-b border-slate-100/50 dark:border-slate-800/50">
          <NavLink to="/profile" className="flex items-center gap-3 group">
            <div className="relative shrink-0">
              <img
                src={guest.avatar_url}
                alt="avatar"
                className="w-10 h-10 rounded-xl object-cover bg-slate-200 dark:bg-slate-800 ring-2 ring-indigo-500/20 group-hover:ring-indigo-500/50 transition-all"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                {guest.nickname}
              </p>
              <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Online
              </p>
            </div>
          </NavLink>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-3 space-y-0.5">
        <p className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-600 uppercase px-3 pt-1 pb-2">
          Navigation
        </p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/20'
                    : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                }`}>
                  <link.icon size={16} />
                </span>
                <span className="flex-1">{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100/50 dark:border-slate-800/50 mt-2">
        <p className="text-[9px] text-slate-300 dark:text-slate-600 text-center font-semibold">
          VibeChat © 2026
        </p>
      </div>
    </aside>
  );
}
