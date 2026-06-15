import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, MessageSquare, Heart, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await adminService.getStats();
        setStats(res.data.stats);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30rem]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center max-w-md mx-auto space-y-4">
        <Shield size={40} className="text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
        <Link 
          to="/profile" 
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all"
        >
          Go to Profile
        </Link>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Guests', value: stats?.total_guests, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Total Posts', value: stats?.total_posts, icon: FileText, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { title: 'Total Comments', value: stats?.total_comments, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Total Likes', value: stats?.total_likes, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="text-indigo-600 dark:text-indigo-400" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Admin Control Center</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            System overview and moderation features.
          </p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-5 space-y-3"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.title}</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Links / Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manage Posts Card */}
        <div className="glass-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Post Moderation</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Search, filter, inspect, and delete posts flagrantly violating policies.
            </p>
          </div>
          <Link
            to="/admin/posts"
            className="mt-6 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/25"
          >
            Manage Posts <ArrowRight size={16} />
          </Link>
        </div>

        {/* Manage Comments Card */}
        <div className="glass-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Comment Moderation</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Moderate discussion boards and delete spam or toxic replies instantly.
            </p>
          </div>
          <Link
            to="/admin/comments"
            className="mt-6 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/25"
          >
            Manage Comments <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
