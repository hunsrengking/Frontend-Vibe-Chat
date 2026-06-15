import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Flame, MessageSquare, User, Check, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import useAuthStore from '../store/useAuthStore';
import getEcho from '../utils/echo';

export default function DefaultLayout() {
  const { guest, token } = useAuthStore();
  const [toasts, setToasts] = useState([]);

  // Request native push notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const showNotification = (notification) => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-2), { id, ...notification }]); // max 3
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const triggerNativeNotification = (notification) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.hidden) {
      try {
        if (notification.commenter_nickname) {
          new Notification(`${notification.commenter_nickname} commented`, {
            body: notification.content || 'Tap to view.',
            icon: notification.commenter_avatar_url || '/favicon.ico',
          });
        }
      } catch (_) {}
    }
  };

  // App-level toast events (clipboard copy, etc.)
  useEffect(() => {
    const handler = (e) => { if (e.detail) showNotification(e.detail); };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  // Real-time comment notifications
  useEffect(() => {
    if (!guest || !token) return;
    const echo = getEcho(token);
    if (!echo) return;

    echo.private(`guest-notifications.${guest.id}`)
      .listen('CommentNotification', (e) => {
        showNotification(e);
        triggerNativeNotification(e);
      });

    return () => { echo.leave(`guest-notifications.${guest.id}`); };
  }, [guest, token]);

  const mobileLinks = [
    { to: '/',         label: 'Feed',    icon: Home,         exact: true },
    { to: '/trending', label: 'Explore', icon: Flame },
    { to: '/chat',     label: 'Chat',    icon: MessageSquare },
    { to: '/profile',  label: 'Profile', icon: User },
  ];

  if (guest?.is_admin) {
    mobileLinks.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-[#0A0F1E] dark:via-indigo-950/20 dark:to-[#0A0F1E] transition-colors duration-300 px-3 sm:px-5 lg:px-8 py-4 pb-20 sm:pb-6 relative">
      <div className="max-w-6xl mx-auto">
        <Navbar />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
          {/* Desktop Sidebar */}
          <div className="hidden md:block md:col-span-1 sticky top-4">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="col-span-1 md:col-span-3 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2.5 pointer-events-none w-full max-w-[320px]">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0,  scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.92 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="pointer-events-auto glass-card rounded-2xl p-3.5 shadow-xl flex items-start gap-3 border border-white/30 dark:border-slate-700/30"
            >
              {toast.commenter_avatar_url ? (
                <>
                  <img
                    src={toast.commenter_avatar_url}
                    alt="avatar"
                    className="w-9 h-9 rounded-xl object-cover bg-slate-100 shrink-0 ring-2 ring-indigo-500/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                      {toast.commenter_nickname}
                      <span className="font-normal text-slate-500 dark:text-slate-400"> commented on your post</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate italic">
                      "{toast.content}"
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    toast.type === 'error'
                      ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600'
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
                  }`}>
                    {toast.type === 'error' ? <X size={15} /> : <Check size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                      {toast.title || 'Notification'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {toast.message}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        {/* Blur background */}
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60" />
        <div className="relative flex justify-around items-center px-2 pt-2 pb-safe-or-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {mobileLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className="flex-1"
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-0.5 py-1">
                  <div className={`relative flex items-center justify-center w-11 h-8 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 shadow-md shadow-indigo-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}>
                    <link.icon
                      size={18}
                      className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}
                    />
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-xl bg-indigo-600"
                        style={{ zIndex: -1 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold transition-colors ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-500'
                  }`}>
                    {link.label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
