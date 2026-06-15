import React from 'react';
import { Users, Shield } from 'lucide-react';
import useChatStore from '../store/useChatStore';
import useAuthStore from '../store/useAuthStore';

export default function OnlineUsers() {
  const { onlineUsers } = useChatStore();
  const { guest } = useAuthStore();

  return (
    <div className="glass-card rounded-3xl p-5 border border-white/20 h-full flex flex-col space-y-4">
      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
        <Users size={16} className="text-indigo-500" />
        Online Users ({onlineUsers.length})
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2">
        {onlineUsers.map((user) => {
          const isSelf = user.id === guest?.id;
          return (
            <div
              key={user.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                isSelf 
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold uppercase text-[9px] text-slate-500 shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user.nickname?.substring(0, 2)
                )}
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-350 truncate flex-1">
                {user.nickname} {isSelf && '(You)'}
              </span>
              {user.is_admin && (
                <Shield size={12} className="text-indigo-500 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
