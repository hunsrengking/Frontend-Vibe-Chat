import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Moon, Sun, Edit2, Check, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function Profile() {
  const { guest, updateProfile, promoteToAdmin, darkMode, toggleDarkMode, error, loading } = useAuthStore();
  
  const getStyleFromUrl = (url) => {
    if (!url) return 'adventurer';
    if (url.includes('/bottts/')) return 'bottts';
    if (url.includes('/lorelei/')) return 'lorelei';
    if (url.includes('/fun-emoji/')) return 'fun-emoji';
    return 'adventurer';
  };

  const [nickname, setNickname] = useState(guest?.nickname || '');
  const [avatarStyle, setAvatarStyle] = useState(getStyleFromUrl(guest?.avatar_url));
  const [adminKey, setAdminKey] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess(false);
    if (!nickname.trim()) return;
    
    const finalAvatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(nickname)}`;
    const success = await updateProfile(nickname, finalAvatarUrl);
    if (success) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  };

  const handlePromoteAdmin = async (e) => {
    e.preventDefault();
    setAdminSuccess(false);
    setAdminError('');
    if (!adminKey.trim()) return;

    const success = await promoteToAdmin(adminKey);
    if (success) {
      setAdminSuccess(true);
      setAdminKey('');
    } else {
      setAdminError(error || 'Failed to verify admin key.');
    }
  };

  const avatarPreviewUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(nickname || 'Guest')}`;

  const avatarStyles = [
    { key: 'adventurer', label: 'Cartoon' },
    { key: 'lorelei', label: 'Anime' },
    { key: 'bottts', label: 'Robot' },
    { key: 'fun-emoji', label: 'Emoji' },
  ];

  const hasChanges = nickname !== guest?.nickname || avatarStyle !== getStyleFromUrl(guest?.avatar_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-8 pb-12"
    >
      {/* Profile Card */}
      <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50/10 dark:bg-indigo-950/20 border border-slate-200/50 dark:border-slate-800 p-2 flex items-center justify-center shadow-lg shrink-0">
            <img src={avatarPreviewUrl} alt="Avatar preview" className="w-full h-full object-contain" />
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 justify-center sm:justify-start">
              {guest?.nickname}
              {guest?.is_admin && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-650 dark:text-indigo-400">
                  <Shield size={12} /> Admin
                </span>
              )}
            </h1>
            {/* <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 truncate">
              Token: <code className="bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-xs select-all text-slate-650 dark:text-indigo-300 font-mono">{guest?.guest_token}</code>
            </p> */}
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nickname and Avatar Form */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Edit2 size={18} className="text-indigo-500" /> Customize Profile
          </h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block pl-1">Alias nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Choose nickname..."
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-205 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm font-semibold"
              />
            </div>

            {/* Avatar Style Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 block pl-1">Cute avatar style</label>
              <div className="grid grid-cols-4 gap-1.5">
                {avatarStyles.map((style) => (
                  <button
                    key={style.key}
                    type="button"
                    onClick={() => setAvatarStyle(style.key)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      avatarStyle === style.key
                        ? 'bg-indigo-650 border-indigo-600 text-white shadow-md'
                        : 'bg-white/40 dark:bg-slate-900/40 border-slate-205 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {profileSuccess && (
              <p className="text-emerald-505 text-xs flex items-center gap-1">
                <Check size={14} /> Profile successfully updated!
              </p>
            )}
            {error && (
              <p className="text-rose-500 text-xs flex items-center gap-1">
                <AlertCircle size={14} /> {error}
              </p>
            )}
            
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Preferences / Theme */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sun size={18} className="text-amber-500 dark:hidden" />
              <Moon size={18} className="hidden dark:block text-indigo-400" />
              Appearance
            </h2>
            <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
              Switch between light and dark modes to customize your reading environment.
            </p>
          </div>
          
          <button
            onClick={toggleDarkMode}
            className="w-full mt-6 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-white/40 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {darkMode ? (
              <>
                <Sun size={16} className="text-amber-500 animate-spin-slow" />
                Light Theme
              </>
            ) : (
              <>
                <Moon size={16} className="text-indigo-550" />
                Dark Theme
              </>
            )}
          </button>
        </div>
      </div>

      {/* Admin Verification Section */}
      {!guest?.is_admin && (
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield size={18} className="text-purple-500" /> Administrator Activation
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Enter the secret admin invite key below to promote your guest account to administrator.
          </p>
          <form onSubmit={handlePromoteAdmin} className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin secret key..."
              required
              className="flex-1 px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-purple-500/25 cursor-pointer"
            >
              Verify Key
            </button>
          </form>
          {adminSuccess && (
            <p className="text-emerald-500 text-xs flex items-center gap-1">
              <Check size={14} /> Congratulations! You have been promoted to Admin.
            </p>
          )}
          {adminError && (
            <p className="text-rose-500 text-xs flex items-center gap-1">
              <AlertCircle size={14} /> {adminError}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
