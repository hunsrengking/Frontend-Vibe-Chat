import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AlertCircle, Image, Smile, X } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import usePostStore from '../store/usePostStore';

export default function CreatePost() {
  const { guest } = useAuthStore();
  const { createPost, error } = usePostStore();
  
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds the 10MB limit.");
      return;
    }

    setMediaFile(file);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setIsFocused(true);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!content.trim() && !mediaFile) || loading) return;

    setLoading(true);
    const success = await createPost(content, mediaFile);
    setLoading(false);
    
    if (success) {
      setContent('');
      handleRemoveMedia();
      setIsFocused(false);
    }
  };

  const showActions = isFocused || content.trim() || mediaFile;

  return (
    <div className="glass-card rounded-3xl p-5 border border-slate-100 dark:border-slate-800/50 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 items-start">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center uppercase select-none shadow-sm shadow-indigo-500/10">
            {guest?.nickname?.substring(0, 2)}
          </div>

          {/* Input & Preview Area */}
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder={mediaFile ? "Add a description (optional)..." : "Share an anonymous status..."}
              rows={showActions ? 3 : 1}
              maxLength={1000}
              required={!mediaFile}
              className="w-full bg-transparent border-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:ring-0 text-sm py-1.5 transition-all"
            />

            {/* Media Preview Container */}
            {mediaPreview && (
              <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-900/30 max-w-md shadow-inner group">
                {mediaType === 'video' ? (
                  <video src={mediaPreview} controls className="w-full max-h-72 object-contain bg-black" />
                ) : (
                  <img src={mediaPreview} alt="Status upload preview" className="w-full max-h-72 object-contain bg-slate-900/5" />
                )}
                
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
        />

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-rose-500 text-xs px-1"
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Bar */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50"
          >
            {/* Auxiliary actions */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 hover:bg-slate-150 dark:hover:bg-slate-900 rounded-xl text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                title="Attach Image or Video"
              >
                <Image size={16} />
              </button>
            </div>

            {/* Cancel & Submit buttons */}
            <div className="flex gap-2 items-center">
              {(content.trim() || mediaFile) && (
                <button
                  type="button"
                  onClick={() => { setContent(''); handleRemoveMedia(); setIsFocused(false); }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-505 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (!content.trim() && !mediaFile)}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={12} />
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}
