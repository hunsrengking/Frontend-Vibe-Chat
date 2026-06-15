import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Edit3, Trash2, Shield, MoreHorizontal, Check, X, Share2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import usePostStore from '../store/usePostStore';
import CommentList from './CommentList';

export default function PostCard({ post, defaultShowComments = false }) {
  const { guest, openUserProfile } = useAuthStore();
  const { toggleLikePost, deletePost, updatePost } = usePostStore();
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = guest?.id === post.guest?.id;
  const isAdmin = guest?.is_admin;
  const canModify = isOwner || isAdmin;

  const handleLike = () => {
    toggleLikePost(post.id);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editContent.trim() || loading) return;

    setLoading(true);
    const success = await updatePost(post.id, editContent);
    setLoading(false);
    
    if (success) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost(post.id);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    const shareTitle = `Post by ${post.guest?.nickname || 'Anonymous'} | Antigravity Social`;
    const shareText = post.content ? post.content.substring(0, 100) : 'Check out this post on Antigravity Social!';

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url).then(
      () => {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: {
              type: 'success',
              message: 'Link copied to clipboard!',
              title: 'Shared!',
            },
          })
        );
      },
      () => {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: {
              type: 'error',
              message: 'Failed to copy link.',
              title: 'Error',
            },
          })
        );
      }
    );
  };

  return (
    <motion.div
      layout
      className="glass-card rounded-3xl p-5 border border-slate-100 dark:border-slate-800/50 shadow-sm relative"
    >
      {/* Card Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => post.guest?.id && openUserProfile(post.guest.id)}
            className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold uppercase select-none shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          >
            {post.guest?.avatar_url ? (
              <img src={post.guest.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              post.guest?.nickname?.substring(0, 2) || 'G'
            )}
          </div>
          <div>
            <h4 
              onClick={() => post.guest?.id && openUserProfile(post.guest.id)}
              className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {post.guest?.nickname || 'Anonymous Guest'}
              {post.guest?.is_admin && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-550/20 text-indigo-600 dark:text-indigo-400">
                  <Shield size={10} /> Staff
                </span>
              )}
            </h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Options Menu */}
        {canModify && !isEditing && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-36 glass rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-20 py-1">
                  {isOwner && (
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} /> Edit Status
                    </button>
                  )}
                  <button
                    onClick={() => { handleDelete(); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="mt-4">
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={1000}
              required
              className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X size={14} />
              </button>
              <button
                type="submit"
                disabled={loading || !editContent.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer"
              >
                <Check size={14} />
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {post.content && (
              <p className="text-slate-700 dark:text-slate-350 text-sm break-words leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            )}
            {post.media_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/10 max-h-[30rem] flex items-center justify-center">
                {post.media_type === 'video' ? (
                  <video 
                    src={post.media_url} 
                    controls 
                    className="w-full max-h-[30rem] object-contain bg-black" 
                  />
                ) : (
                  <img 
                    src={post.media_url} 
                    alt="Status media attachment" 
                    className="w-full max-h-[30rem] object-contain bg-slate-900/5 dark:bg-black/5" 
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="flex gap-6 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/40">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            post.is_liked
              ? 'text-rose-500'
              : 'text-slate-500 hover:text-rose-500'
          }`}
        >
          <Heart size={16} className={post.is_liked ? 'fill-rose-500' : ''} />
          <span>{post.likes_count}</span>
        </button>

        {/* Comment toggle button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            showComments
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          <MessageSquare size={16} />
          <span>{post.comments_count}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer ml-auto"
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/40">
              <CommentList postId={post.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
