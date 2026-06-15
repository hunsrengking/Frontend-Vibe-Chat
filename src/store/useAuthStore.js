import { create } from 'zustand';
import { guestService, adminService } from '../services/api';

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('guest_token') || null,
  guest: JSON.parse(localStorage.getItem('guest_profile')) || null,
  isAuthenticated: !!localStorage.getItem('guest_token'),
  darkMode: localStorage.getItem('theme') === 'dark',
  loading: false,
  error: null,

  // Public profile modal viewing states
  showUserProfileModal: false,
  viewedGuestId: null,
  viewedGuestProfile: null,
  viewedGuestPosts: [],
  viewedGuestPostsPage: 1,
  viewedGuestPostsHasMore: true,
  viewedGuestLoading: false,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  initAuth: async () => {
    const { token } = get();
    if (!token) return;

    set({ loading: true });
    try {
      const res = await guestService.getProfile();
      const guestData = res.data.data;
      localStorage.setItem('guest_profile', JSON.stringify(guestData));
      set({ guest: guestData, isAuthenticated: true, loading: false });
    } catch (err) {
      console.error('Failed to load profile', err);
      get().logout();
      set({ loading: false });
    }
  },

  register: async (username, password, nickname, avatarUrl) => {
    set({ loading: true, error: null });
    try {
      const res = await guestService.register(username, password, nickname, avatarUrl);
      const { token, guest } = res.data;
      
      localStorage.setItem('guest_token', token);
      localStorage.setItem('guest_profile', JSON.stringify(guest));
      
      set({
        token,
        guest,
        isAuthenticated: true,
        loading: false,
      });
      return true;
    } catch (err) {
      const errors = err.response?.data?.errors;
      const errMsg = errors?.username?.[0] || errors?.password?.[0] || errors?.nickname?.[0] || err.response?.data?.message || 'Failed to join.';
      set({ error: errMsg, loading: false });
      return false;
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await guestService.login(username, password);
      const { token, guest } = res.data;
      
      localStorage.setItem('guest_token', token);
      localStorage.setItem('guest_profile', JSON.stringify(guest));
      
      set({
        token,
        guest,
        isAuthenticated: true,
        loading: false,
      });
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to login.';
      set({ error: errMsg, loading: false });
      return false;
    }
  },

  updateProfile: async (nickname, avatarUrl) => {
    set({ loading: true, error: null });
    try {
      const res = await guestService.updateProfile(nickname, avatarUrl);
      const updatedGuest = res.data.guest;
      localStorage.setItem('guest_profile', JSON.stringify(updatedGuest));
      set({ guest: updatedGuest, loading: false });
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.errors?.nickname?.[0] || err.response?.data?.message || 'Failed to update profile.';
      set({ error: errMsg, loading: false });
      return false;
    }
  },

  promoteToAdmin: async (secretKey) => {
    set({ loading: true, error: null });
    try {
      const res = await adminService.verifyKey(secretKey);
      const updatedGuest = { ...get().guest, is_admin: true };
      localStorage.setItem('guest_profile', JSON.stringify(updatedGuest));
      set({ guest: updatedGuest, loading: false });
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid admin secret.';
      set({ error: errMsg, loading: false });
      return false;
    }
  },

  toggleDarkMode: () => {
    const isDark = !get().darkMode;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: isDark });
  },

  initDarkMode: () => {
    const isDark = get().darkMode || window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
      set({ darkMode: true });
    } else {
      document.documentElement.classList.remove('dark');
      set({ darkMode: false });
    }
  },

  openUserProfile: async (id) => {
    set({ 
      showUserProfileModal: true, 
      viewedGuestId: id, 
      viewedGuestProfile: null, 
      viewedGuestPosts: [], 
      viewedGuestPostsPage: 1,
      viewedGuestPostsHasMore: true,
      viewedGuestLoading: true 
    });
    
    try {
      const profileRes = await guestService.getPublicProfile(id);
      set({ viewedGuestProfile: profileRes.data.data });
    } catch (err) {
      console.error('Failed to fetch public profile', err);
    } finally {
      set({ viewedGuestLoading: false });
    }

    get().fetchViewedGuestPosts(id, 1);
  },

  fetchViewedGuestPosts: async (id, page = 1) => {
    try {
      const postsRes = await guestService.getPublicPosts(id, page);
      const newPosts = postsRes.data.data;
      const meta = postsRes.data.meta;
      
      set((state) => ({
        viewedGuestPosts: page === 1 ? newPosts : [...state.viewedGuestPosts, ...newPosts],
        viewedGuestPostsPage: page,
        viewedGuestPostsHasMore: meta ? (meta.current_page < meta.last_page) : (newPosts.length > 0)
      }));
    } catch (err) {
      console.error('Failed to fetch public posts', err);
    }
  },

  closeUserProfile: () => {
    set({ 
      showUserProfileModal: false, 
      viewedGuestId: null, 
      viewedGuestProfile: null, 
      viewedGuestPosts: [],
      viewedGuestPostsPage: 1,
      viewedGuestPostsHasMore: true
    });
  },

  logout: () => {
    localStorage.removeItem('guest_token');
    localStorage.removeItem('guest_profile');
    set({
      token: null,
      guest: null,
      isAuthenticated: false,
    });
  },
}));

export default useAuthStore;
