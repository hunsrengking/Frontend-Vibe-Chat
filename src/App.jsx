import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, AlertCircle, Sparkles } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Chat from './pages/Chat';
import Trending from './pages/Trending';
import Profile from './pages/Profile';
import PostDetails from './pages/PostDetails';
import AdminDashboard from './pages/AdminDashboard';
import AdminPosts from './pages/AdminPosts';
import AdminComments from './pages/AdminComments';

// Layouts
import DefaultLayout from './layouts/DefaultLayout';
import AdminLayout from './layouts/AdminLayout';

// Store
import useAuthStore from './store/useAuthStore';

// Components
import UserProfileModal from './components/UserProfileModal';

export default function App() {
  const { 
    isAuthenticated, 
    register, 
    login,
    initAuth, 
    initDarkMode, 
    loading, 
    error, 
    setError 
  } = useAuthStore();
  
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('adventurer');
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);

  // Initialize auth session and dark mode state on mount
  useEffect(() => {
    initAuth();
    initDarkMode();
  }, [initAuth, initDarkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || joining) return;

    setJoining(true);
    setError(null);
    
    let success = false;
    if (authMode === 'register') {
      if (!nickname.trim()) {
        setError('Nickname is required for registration.');
        setJoining(false);
        return;
      }
      const finalAvatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(nickname)}`;
      success = await register(username, password, nickname, finalAvatarUrl);
    } else {
      success = await login(username, password);
    }
    setJoining(false);
  };

  const avatarPreviewUrl = authMode === 'register'
    ? `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(nickname || 'Guest')}`
    : `https://api.dicebear.com/7.x/bottts/svg?seed=login-key`;

  const avatarStyles = [
    { key: 'adventurer', label: 'Cartoon' },
    { key: 'lorelei', label: 'Anime' },
    { key: 'bottts', label: 'Robot' },
    { key: 'fun-emoji', label: 'Emoji' },
  ];

  // Welcome Screen for Unauthenticated Visitors
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
        {/* Dynamic Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md glass-card rounded-3xl p-8 border border-white/20 relative z-10 shadow-2xl"
        >
          <div className="text-center space-y-5">
            {/* Cute Avatar Preview */}
            <div className="relative w-24 h-24 mx-auto rounded-3xl bg-indigo-550/10 dark:bg-indigo-500/20 border border-slate-200/50 dark:border-slate-800 p-2 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <img src={avatarPreviewUrl} alt="Avatar preview" className="w-full h-full object-contain" />
            </div>

            {/* Slogans */}
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-850 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
                Vide <span className="text-indigo-650 dark:text-indigo-400">Chat</span>
                <Sparkles size={16} className="text-indigo-500 fill-indigo-500" />
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mx-auto">
                Join anonymously. Share thoughts. Chat in real time.
              </p>
            </div>

            {/* Auth Mode Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                }`}
              >
                Register
              </button>
            </div>

            {/* Nickname Submission */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block text-left pl-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username..."
                  maxLength={20}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block text-left pl-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm text-center font-bold"
                />
              </div>

              {authMode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden pt-2 text-left"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block text-left pl-1">Choose alias nickname</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter alias nickname..."
                      maxLength={20}
                      required={authMode === 'register'}
                      className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm text-center font-bold"
                    />
                  </div>

                  {/* Avatar Style Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block text-left pl-1">Choose Cute avatar style</label>
                    <div className="grid grid-cols-4 gap-2">
                      {avatarStyles.map((style) => (
                        <button
                          key={style.key}
                          type="button"
                          onClick={() => setAvatarStyle(style.key)}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                            avatarStyle === style.key
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10'
                              : 'bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error output */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-center gap-2 text-rose-500 text-xs py-1"
                  >
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={joining || !username.trim() || !password.trim()}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {joining ? 'Processing...' : authMode === 'register' ? 'Register & Join' : 'Sign In'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Application routes for authenticated visitors
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Default Feed and Profile layout */}
        <Route path="/" element={<DefaultLayout />}>
          <Route index element={<Home />} />
          <Route path="trending" element={<Trending />} />
          <Route path="chat" element={<Chat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="posts/:id" element={<PostDetails />} />
        </Route>

        {/* Administration routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="comments" element={<AdminComments />} />
        </Route>

        {/* Fallback redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UserProfileModal />
    </BrowserRouter>
  );
}
