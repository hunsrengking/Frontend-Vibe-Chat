import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { commentService } from '../services/api';

export default function CommentForm({ postId, parentId = null, onCommentAdded, placeholder = "Write a comment..." }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    setError('');
    try {
      const res = await commentService.create(postId, content, parentId);
      setContent('');
      if (onCommentAdded) {
        onCommentAdded(res.data.data);
      }
    } catch (err) {
      const errMsg = err.response?.data?.errors?.content?.[0] || err.response?.data?.message || 'Failed to submit comment.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          required
          className="flex-1 px-4 py-2 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-205 dark:border-slate-800 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 dark:text-white transition-all text-xs"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          <Send size={12} />
        </button>
      </div>
      {error && (
        <p className="text-rose-500 text-[10px] flex items-center gap-1 px-1">
          <AlertCircle size={10} />
          {error}
        </p>
      )}
    </form>
  );
}
