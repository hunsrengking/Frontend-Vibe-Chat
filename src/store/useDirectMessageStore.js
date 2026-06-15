import { create } from 'zustand';
import { directMessageService } from '../services/api';

const useDirectMessageStore = create((set, get) => ({
  conversations: [],
  activeChatReceiverId: null,
  messages: [],
  conversationsLoading: false,
  messagesLoading: false,
  dmError: null,

  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await directMessageService.getConversations();
      set({ conversations: res.data.data, conversationsLoading: false });
    } catch (err) {
      console.error('Failed to fetch DM conversations', err);
      set({ conversationsLoading: false });
    }
  },

  fetchMessages: async (receiverId) => {
    set({ messagesLoading: true, dmError: null, activeChatReceiverId: receiverId });
    try {
      const res = await directMessageService.getMessages(receiverId);
      set({ messages: res.data.data, messagesLoading: false });
      
      // Mark as read locally in conversations list
      set((state) => ({
        conversations: state.conversations.map((c) => 
          c.id === receiverId ? { ...c, unread_count: 0 } : c
        )
      }));
    } catch (err) {
      console.error('Failed to fetch DM messages', err);
      set({ dmError: 'Failed to load chat history.', messagesLoading: false });
    }
  },

  sendMessage: async (content, mediaFile = null, mediaType = null) => {
    const { activeChatReceiverId } = get();
    if (!activeChatReceiverId) return false;

    try {
      const res = await directMessageService.sendMessage(
        activeChatReceiverId,
        content,
        mediaFile,
        mediaType
      );
      const newMsg = res.data.data;
      
      // Append message
      set((state) => ({
        messages: [...state.messages, newMsg],
      }));

      // Refresh conversations list
      get().fetchConversations();
      return true;
    } catch (err) {
      console.error('Failed to send DM', err);
      const errors = err.response?.data?.errors;
      const errMsg = errors?.content?.[0] || errors?.media?.[0] || err.response?.data?.message || 'Failed to send message.';
      set({ dmError: errMsg });
      return false;
    }
  },

  addIncomingMessage: (message) => {
    const { activeChatReceiverId } = get();
    const messageSenderId = parseInt(message.sender_id);
    const messageReceiverId = parseInt(message.receiver_id);
    const currentActiveId = activeChatReceiverId ? parseInt(activeChatReceiverId) : null;

    // Check if the message belongs to the currently active direct chat
    if (
      (messageSenderId === currentActiveId) || 
      (messageReceiverId === currentActiveId)
    ) {
      // Prevent duplicates
      set((state) => {
        if (state.messages.some((m) => m.id === message.id)) {
          return state;
        }
        return { messages: [...state.messages, message] };
      });
    }

    // Refresh conversations list to update sidebar preview snippet & badge count
    get().fetchConversations();
  },

  setActiveChatReceiverId: (id) => {
    set({ activeChatReceiverId: id, messages: [], dmError: null });
  },

  clearActiveChat: () => {
    set({ activeChatReceiverId: null, messages: [], dmError: null });
  }
}));

export default useDirectMessageStore;
