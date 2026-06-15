import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp } from 'lucide-react';
import usePostStore from '../store/usePostStore';
import PostCard from '../components/PostCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

export default function Trending() {
  const { trendingPosts, fetchTrending, loading } = usePostStore();

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Banner */}
      <div className="glass rounded-3xl p-6 relative overflow-hidden flex items-center justify-between border border-white/20">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Flame size={22} className="text-rose-500 fill-rose-500 animate-pulse" />
            Trending Feed
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Top interactions and hot discussions in the community right now.
          </p>
        </div>
        <TrendingUp size={36} className="text-slate-300 dark:text-slate-700 relative z-10" />
      </div>

      {/* Post List */}
      <div className="space-y-4">
        {loading && trendingPosts.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <LoadingSkeleton key={i} />
          ))
        ) : trendingPosts.length > 0 ? (
          trendingPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative"
            >
              {/* Hot index label */}
              <div className="absolute -top-1.5 -left-1.5 z-10 w-6 h-6 rounded-lg bg-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-rose-500/20">
                {index + 1}
              </div>
              <PostCard post={post} />
            </motion.div>
          ))
        ) : (
          <EmptyState 
            title="No Trending Posts Yet" 
            message="Check back later after posts start receiving likes and comments!" 
          />
        )}
      </div>
    </motion.div>
  );
}
