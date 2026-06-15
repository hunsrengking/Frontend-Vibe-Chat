import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Trash2, ChevronLeft, ChevronRight, MessageSquare, Heart, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminService, postService } from '../services/api';
import usePostStore from '../store/usePostStore';

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadPosts = async (currentPage = 1, currentSearch = '') => {
    setLoading(true);
    try {
      const res = await adminService.getPosts(currentPage, currentSearch);
      setPosts(res.data.data);
      setPage(res.data.meta.current_page);
      setLastPage(res.data.meta.last_page);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(page, search);
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPosts(1, search);
  };

  const handleDeletePost = async (id) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setDeletingId(id);
    try {
      await postService.delete(id);
      setPosts(posts.filter((post) => post.id !== id));
      
      // Also update post store state in case they navigate back
      usePostStore.setState((state) => ({
        posts: state.posts.filter((p) => p.id !== id)
      }));
    } catch (err) {
      alert('Failed to delete post.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 max-w-3xl mx-auto pb-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-indigo-600 dark:text-indigo-400" size={24} />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Post Moderation</h1>
        </div>
        <Link 
          to="/admin" 
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-all"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by post content or author nickname..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Moderation List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[20rem]">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div 
              key={post.id}
              className="glass-card rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50 flex justify-between gap-4 items-start"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {post.guest?.nickname || 'Unknown Guest'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    ID: {post.id}
                  </span>
                </div>
                {post.content && (
                  <p className="text-slate-600 dark:text-slate-300 text-sm break-words leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}
                {post.media_url && (
                  <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/10 max-h-48 max-w-sm flex items-center justify-center mt-2">
                    {post.media_type === 'video' ? (
                      <video src={post.media_url} controls className="w-full max-h-48 object-contain bg-black" />
                    ) : (
                      <img src={post.media_url} alt="Post media attachment" className="w-full max-h-48 object-contain bg-slate-900/5 dark:bg-black/5" />
                    )}
                  </div>
                )}
                <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-500 pt-1">
                  <span className="flex items-center gap-1"><Heart size={14} /> {post.likes_count} likes</span>
                  <span className="flex items-center gap-1"><MessageSquare size={14} /> {post.comments_count} comments</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleDeletePost(post.id)}
                disabled={deletingId === post.id}
                className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="glass rounded-3xl p-12 text-center text-slate-400 dark:text-slate-600 space-y-2">
            <AlertCircle size={36} className="mx-auto stroke-1" />
            <p className="text-sm">No posts found.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-850 transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">
            Page {page} of {lastPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-850 transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
