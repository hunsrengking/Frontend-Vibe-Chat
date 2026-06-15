import { create } from 'zustand';
import { postService } from '../services/api';

const usePostStore = create((set, get) => ({
  posts: [],
  trendingPosts: [],
  currentPost: null,
  currentPage: 1,
  lastPage: 1,
  hasMore: true,
  searchQuery: '',
  loading: false,
  error: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchPosts: async (page = 1, search = '', append = false) => {
    set({ loading: true, error: null });
    try {
      const res = await postService.getAll(page, search);
      const { data, meta } = res.data;
      
      set((state) => ({
        posts: append ? [...state.posts, ...data] : data,
        currentPage: meta.current_page,
        lastPage: meta.last_page,
        hasMore: meta.current_page < meta.last_page,
        loading: false,
      }));
    } catch (err) {
      set({ error: 'Failed to load feed posts.', loading: false });
    }
  },

  fetchPostById: async (id) => {
    set({ loading: true, error: null, currentPost: null });
    try {
      const res = await postService.getById(id);
      const post = res.data.data;
      set({ currentPost: post, loading: false });
      return post;
    } catch (err) {
      set({ error: 'Failed to load post details.', loading: false });
      return null;
    }
  },

  fetchTrending: async () => {
    try {
      const res = await postService.getTrending(5);
      set({ trendingPosts: res.data.data });
    } catch (err) {
      console.error('Failed to load trending posts', err);
    }
  },

  createPost: async (content, mediaFile = null) => {
    set({ error: null });
    try {
      const res = await postService.create(content, mediaFile);
      const newPost = res.data.data;
      set((state) => ({
        posts: [newPost, ...state.posts],
      }));
      return true;
    } catch (err) {
      const errors = err.response?.data?.errors;
      const errMsg = errors?.content?.[0] || errors?.media?.[0] || err.response?.data?.message || 'Failed to submit post.';
      set({ error: errMsg });
      return false;
    }
  },

  updatePost: async (id, content) => {
    set({ error: null });
    try {
      const res = await postService.update(id, content);
      const updatedPost = res.data.data;
      set((state) => ({
        posts: state.posts.map((post) => (post.id === id ? updatedPost : post)),
        currentPost: state.currentPost && state.currentPost.id === id ? updatedPost : state.currentPost,
      }));
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.errors?.content?.[0] || err.response?.data?.message || 'Failed to edit post.';
      set({ error: errMsg });
      return false;
    }
  },

  deletePost: async (id) => {
    try {
      await postService.delete(id);
      set((state) => ({
        posts: state.posts.filter((post) => post.id !== id),
        currentPost: state.currentPost && state.currentPost.id === id ? null : state.currentPost,
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete post', err);
      return false;
    }
  },

  toggleLikePost: async (id) => {
    // Optimistic Update
    const previousPosts = get().posts;
    const previousCurrentPost = get().currentPost;
    
    set((state) => {
      const updatePostObj = (post) => {
        const nextLiked = !post.is_liked;
        return {
          ...post,
          is_liked: nextLiked,
          likes_count: nextLiked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1),
        };
      };

      return {
        posts: state.posts.map((post) => (post.id === id ? updatePostObj(post) : post)),
        currentPost: state.currentPost && state.currentPost.id === id ? updatePostObj(state.currentPost) : state.currentPost,
      };
    });

    try {
      const res = await postService.toggleLike(id);
      // Synchronize with exact server response
      const { liked, likes_count } = res.data;
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === id ? { ...post, is_liked: liked, likes_count } : post
        ),
        currentPost: state.currentPost && state.currentPost.id === id ? { ...state.currentPost, is_liked: liked, likes_count } : state.currentPost,
      }));
    } catch (err) {
      // Revert if error occurs
      set({ posts: previousPosts, currentPost: previousCurrentPost });
    }
  },
}));

export default usePostStore;
