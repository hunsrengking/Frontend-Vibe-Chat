import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import usePostStore from '../store/usePostStore';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import SearchBar from '../components/SearchBar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

export default function Home() {
  const { 
    posts, 
    fetchPosts, 
    currentPage, 
    hasMore, 
    searchQuery, 
    loading 
  } = usePostStore();

  const observer = useRef();
  
  // Last element callback for infinite scroll detection
  const lastPostElementRef = useCallback((node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts(currentPage + 1, searchQuery, true);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore, currentPage, searchQuery, fetchPosts]);

  // Fetch posts on mount and when search changes
  useEffect(() => {
    fetchPosts(1, searchQuery, false);
  }, [fetchPosts, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 max-w-2xl mx-auto pb-12"
    >
      {/* Search and Filters */}
      <SearchBar />

      {/* Write Post Section */}
      <CreatePost />

      {/* Feed List */}
      <div className="space-y-4">
        {posts.length > 0 ? (
          posts.map((post, index) => {
            const isLast = posts.length === index + 1;
            return (
              <div 
                ref={isLast ? lastPostElementRef : null} 
                key={post.id}
              >
                <PostCard post={post} />
              </div>
            );
          })
        ) : !loading ? (
          <EmptyState 
            title={searchQuery ? "No search results" : "Your Feed is Empty"} 
            message={searchQuery ? "Try searching for a different keyword." : "Be the first to share an anonymous status with the community!"} 
          />
        ) : null}

        {/* Loading Indicator */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: posts.length > 0 ? 1 : 3 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
