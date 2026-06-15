import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import usePostStore from '../store/usePostStore';
import PostCard from '../components/PostCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPost, fetchPostById, loading, error } = usePostStore();

  useEffect(() => {
    if (id) {
      fetchPostById(id);
    }
  }, [id, fetchPostById]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="space-y-6 max-w-2xl mx-auto pb-12"
    >
      {/* Back Button Panel */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Feed</span>
        </button>
      </div>

      {/* Main Single Post Wrapper */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="glass-card border border-rose-100/50 dark:border-rose-950/20 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Post Unavailable</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {error || 'This post has been deleted or does not exist.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Go back to feed
          </button>
        </div>
      ) : currentPost ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <PostCard post={currentPost} defaultShowComments={true} />
        </motion.div>
      ) : (
        <div className="glass-card border border-slate-100 dark:border-slate-800/50 rounded-3xl p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
          Loading post...
        </div>
      )}
    </motion.div>
  );
}
