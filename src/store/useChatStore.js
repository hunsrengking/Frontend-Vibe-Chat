import { create } from 'zustand';
import { chatService, groupService } from '../services/api';

const useChatStore = create((set, get) => ({
  messages: [],
  onlineUsers: [],
  typingUsers: {}, // Maps guest_id to nickname
  groups: [],
  activeGroupId: null, // null means Global Chat
  pendingRequests: [],
  loading: false,
  error: null,

  fetchGroups: async () => {
    try {
      const res = await groupService.getAll();
      set({ groups: res.data.data });
    } catch (err) {
      console.error('Failed to load group chats', err);
    }
  },

  createGroup: async (name, type = 'public', passcode = null) => {
    set({ error: null });
    try {
      const res = await groupService.create(name, type, passcode);
      const newGroup = res.data.data;
      set((state) => ({
        groups: [newGroup, ...state.groups],
      }));
      return newGroup;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create group.';
      set({ error: errMsg });
      return null;
    }
  },

  joinGroup: async (id, passcode = null) => {
    try {
      const res = await groupService.join(id, passcode);
      get().fetchGroups();
      return { success: true, status: res.data.status, message: res.data.message };
    } catch (err) {
      console.error('Failed to join group chat', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to join group.';
      return { success: false, error: errMsg };
    }
  },

  fetchPendingRequests: async (groupId) => {
    try {
      const res = await groupService.getRequests(groupId);
      set({ pendingRequests: res.data.data });
    } catch (err) {
      console.error('Failed to fetch group requests', err);
    }
  },

  resolveRequest: async (groupId, requestId, status) => {
    try {
      await groupService.handleRequest(groupId, requestId, status);
      set((state) => ({
        pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
      }));
      get().fetchGroups();
      return true;
    } catch (err) {
      console.error('Failed to resolve group request', err);
      return false;
    }
  },

  setActiveGroupId: (id) => {
    set({ activeGroupId: id, messages: [], onlineUsers: [], typingUsers: {}, pendingRequests: [] });
  },

  fetchMessages: async () => {
    set({ loading: true, error: null });
    const { activeGroupId } = get();
    try {
      const res = await chatService.getRecent(50, activeGroupId);
      set({ messages: res.data.data, loading: false });
    } catch (err) {
      set({ error: 'Failed to load chat history.', loading: false });
    }
  },

  sendMessage: async (content, mediaFile = null, mediaType = null) => {
    const { activeGroupId } = get();
    try {
      const res = await chatService.sendMessage(content, mediaFile, mediaType, activeGroupId);
      const newMsg = res.data.data;
      get().addMessage(newMsg);
      return true;
    } catch (err) {
      const errors = err.response?.data?.errors;
      const errMsg = errors?.content?.[0] || errors?.media?.[0] || err.response?.data?.message || 'Failed to send message.';
      set({ error: errMsg });
      return false;
    }
  },

  addMessage: (message) => {
    set((state) => {
      // Scoping: If the message is for a different room, ignore it
      const messageGroupId = message.group_chat_id ? parseInt(message.group_chat_id) : null;
      const activeId = state.activeGroupId ? parseInt(state.activeGroupId) : null;
      if (messageGroupId !== activeId) {
        return state;
      }
      
      // Prevent duplicates
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    });
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),
  
  addOnlineUser: (user) => set((state) => {
    if (state.onlineUsers.some((u) => u.id === user.id)) return state;
    return { onlineUsers: [...state.onlineUsers, user] };
  }),

  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
    typingUsers: (() => {
      const next = { ...state.typingUsers };
      delete next[userId];
      return next;
    })(),
  })),

  setUserTyping: (userId, nickname, isTyping) => set((state) => {
    const nextTyping = { ...state.typingUsers };
    if (isTyping) {
      nextTyping[userId] = nickname;
    } else {
      delete nextTyping[userId];
    }
    return { typingUsers: nextTyping };
  }),
}));

export default useChatStore;
