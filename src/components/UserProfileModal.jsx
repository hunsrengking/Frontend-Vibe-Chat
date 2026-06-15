import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Calendar, Sparkles, BookOpen } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useDirectMessageStore from '../store/useDirectMessageStore';
import { useNavigate } from 'react-router-dom';
import PostCard from './PostCard';

export default function UserProfileModal() {
  const navigate = useNavigate();
  const modalRef = useRef(null);

  const {
    guest: currentAuthGuest,
    showUserProfileModal,
    viewedGuestId,
    viewedGuestProfile,
    viewedGuestPosts,
    viewedGuestPostsHasMore,
    viewedGuestPostsPage,
    viewedGuestLoading,
    fetchViewedGuestPosts,
    closeUserProfile,
  } = useAuthStore();

  const { fetchMessages, fetchConversations } = useDirectMessageStore();

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeUserProfile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeUserProfile]);

  if (!showUserProfileModal) return null;

  const handleMessageClick = () => {
    if (!viewedGuestProfile) return;
    
    // Close the profile modal
    closeUserProfile();

    // Set active chat and pre-fetch direct messages
    fetchMessages(viewedGuestProfile.id);
    fetchConversations();

    // Navigate to direct messages page
    navigate('/chat');
  };

  // Format date (e.g. Member since Jun 15, 2026)
  const formatMemberSince = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (viewedGuestPostsHasMore && viewedGuestId && !viewedGuestLoading) {
        fetchViewedGuestPosts(viewedGuestId, viewedGuestPostsPage + 1);
      }
    }
  };

  const isSelf = currentAuthGuest?.id === viewedGuestId;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeUserProfile}
          className="absolute inset-0 bg-black/55 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          ref={modalRef}
          className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-white/20 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header Panel with Gradient Background */}
          <div className="relative bg-gradient-to-r from-indigo-600/80 to-purple-600/80 p-6 flex flex-col md:flex-row items-center gap-5 border-b border-white/10">
            {/* Close Button */}
            <button
              onClick={closeUserProfile}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* User Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shrink-0">
              {viewedGuestProfile?.avatar_url ? (
                <img
                  src={viewedGuestProfile.avatar_url}
                  alt={viewedGuestProfile.nickname}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-2xl font-black text-white uppercase">
                  {viewedGuestProfile?.nickname?.substring(0, 2) || 'GU'}
                </div>
              )}
            </div>

            {/* Profile Info Details */}
            <div className="text-center md:text-left flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h2 className="text-xl font-black text-white truncate">
                  {viewedGuestProfile?.nickname || 'Anonymous Guest'}
                </h2>
                {isSelf && (
                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold tracking-wider uppercase shrink-0">
                    <Sparkles size={8} /> You
                  </span>
                )}
              </div>
              
              <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-white/70 text-xs">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  Member since {formatMemberSince(viewedGuestProfile?.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen size={13} />
                  {viewedGuestProfile?.posts_count || 0} posts
                </span>
              </div>
            </div>

            {/* Direct Message Button (hidden if viewing self) */}
            {!isSelf && (
              <button
                onClick={handleMessageClick}
                className="mt-3 md:mt-0 px-5 py-3 rounded-2xl bg-white text-indigo-650 hover:bg-indigo-50 font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <MessageSquare size={14} className="fill-indigo-600/10" />
                Chat Personal
              </button>
            )}
          </div>

          {/* User Posts Feed List */}
          <div 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <h3 className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider pl-1">
              Posts Timeline
            </h3>

            {viewedGuestLoading && viewedGuestPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4" />
                <p className="text-xs font-bold">Loading profile data...</p>
              </div>
            ) : viewedGuestPosts.length > 0 ? (
              <div className="space-y-4">
                {viewedGuestPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}

                {viewedGuestPostsHasMore && (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl bg-white/40 dark:bg-slate-950/40">
                <BookOpen size={32} className="stroke-1 mb-2" />
                <p className="text-xs font-bold">No posts shared by this guest yet.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
