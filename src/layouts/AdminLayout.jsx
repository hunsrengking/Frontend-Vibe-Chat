import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, MessageSquare, ArrowLeft } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminLayout() {
  const { guest } = useAuthStore();

  // Route protection
  if (!guest || !guest.is_admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Admin Navigation Bar */}
        <header className="glass px-6 py-4 rounded-3xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield size={18} />
            </div>
            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
              PrinceTufu <span className="text-purple-600 dark:text-purple-400">Admin</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="px-4 py-2 rounded-xl border border-slate-205 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft size={12} /> Exit Panel
            </Link>
          </div>
        </header>

        {/* Inner Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* Admin Sidebar Menu */}
          <aside className="glass rounded-3xl p-5 border border-white/20 space-y-1.5 md:col-span-1">
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
            >
              <LayoutDashboard size={14} /> Dashboard
            </Link>
            <Link
              to="/admin/posts"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
            >
              <FileText size={14} /> Manage Posts
            </Link>
            <Link
              to="/admin/comments"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
            >
              <MessageSquare size={14} /> Manage Comments
            </Link>
          </aside>

          {/* Admin Panel Workspace */}
          <main className="md:col-span-3">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
