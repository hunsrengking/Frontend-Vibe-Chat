import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Reply, Shield } from 'lucide-react';
import { commentService } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import usePostStore from '../store/usePostStore';
import CommentForm from './CommentForm';

export default function CommentList({ postId }) {
  const { guest, openUserProfile } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadComments = async () => {
    try {
      const res = await commentService.getByPost(postId);
      setComments(res.data.data);
    } catch (err) {
      console.error('Failed to load comments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  const handleCommentAdded = (newComment) => {
    if (newComment.parent_id) {
      // Find parent recursively and add to its replies
      const addReplyRecursively = (list) => {
        return list.map((item) => {
          if (item.id === newComment.parent_id) {
            return {
              ...item,
              replies: [...(item.replies || []), newComment],
            };
          } else if (item.replies && item.replies.length > 0) {
            return {
              ...item,
              replies: addReplyRecursively(item.replies),
            };
          }
          return item;
        });
      };
      setComments(addReplyRecursively(comments));
    } else {
      setComments([...comments, newComment]);
    }

    // Increment post store comment count
    usePostStore.setState((state) => ({
      posts: state.posts.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p)
    }));
  };

  const handleCommentDeleted = async (id) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await commentService.delete(id);
      
      const removeRecursively = (list) => {
        return list
          .filter((item) => item.id !== id)
          .map((item) => ({
            ...item,
            replies: item.replies ? removeRecursively(item.replies) : [],
          }));
      };
      
      setComments(removeRecursively(comments));

      // Decrement post store comment count
      usePostStore.setState((state) => ({
        posts: state.posts.map((p) => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p)
      }));
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  // Nested Comment Node Component
  const CommentNode = ({ comment, depth = 0 }) => {
    const [isReplying, setIsReplying] = useState(false);
    const isOwner = guest?.id === comment.guest?.id;
    const isAdmin = guest?.is_admin;
    const canDelete = isOwner || isAdmin;

    return (
      <div className="space-y-3 pl-1">
        <div className="flex gap-2.5 items-start">
          {/* Avatar bubble */}
          <div 
            onClick={() => comment.guest?.id && openUserProfile(comment.guest.id)}
            className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-505 flex items-center justify-center uppercase select-none shrink-0 mt-0.5 cursor-pointer hover:opacity-85 transition-opacity"
          >
            {comment.guest?.avatar_url ? (
              <img src={comment.guest.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              comment.guest?.nickname?.substring(0, 2) || 'G'
            )}
          </div>

          {/* Comment Bubble */}
          <div className="flex-1 min-w-0 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-850/40 rounded-2xl p-3 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span 
                onClick={() => comment.guest?.id && openUserProfile(comment.guest.id)}
                className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
              >
                {comment.guest?.nickname || 'Anonymous'}
                {comment.guest?.is_admin && (
                  <Shield size={10} className="text-indigo-500" />
                )}
              </span>
              
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
                {canDelete && (
                  <button
                    onClick={() => handleCommentDeleted(comment.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-slate-650 dark:text-slate-350 text-xs break-words leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>

            {/* Actions panel */}
            <div className="flex gap-3 pt-1 text-[10px] font-bold text-slate-500">
              <button 
                onClick={() => setIsReplying(!isReplying)}
                className="hover:text-indigo-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Reply size={10} /> Reply
              </button>
            </div>
          </div>
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="pl-9 pr-2 py-1 bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              placeholder={`Replying to ${comment.guest?.nickname}...`}
              onCommentAdded={(reply) => {
                handleCommentAdded(reply);
                setIsReplying(false);
              }}
            />
          </div>
        )}

        {/* Nested replies list */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="pl-4 ml-3 border-l border-slate-205 dark:border-slate-800 space-y-3 pt-2">
            {comment.replies.map((reply) => (
              <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top level comment form */}
      <CommentForm 
        postId={postId} 
        onCommentAdded={handleCommentAdded}
        placeholder="Add to the discussion..."
      />

      {/* List */}
      <div className="space-y-4 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentNode key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="py-6 text-center text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1.5 text-xs">
            <MessageSquare size={14} />
            No comments yet.
          </div>
        )}
      </div>
    </div>
  );
}
