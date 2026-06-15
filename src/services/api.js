import client from '../api/client';

export const guestService = {
  register: (username, password, nickname, avatarUrl) => 
    client.post('/guest', { username, password, nickname, avatar_url: avatarUrl }),
  login: (username, password) => 
    client.post('/login', { username, password }),
  getProfile: () => client.get('/guest'),
  updateProfile: (nickname, avatarUrl) => client.put('/guest', { nickname, avatar_url: avatarUrl }),
  getPublicProfile: (id) => client.get(`/guests/${id}`),
  getPublicPosts: (id, page = 1) => client.get(`/guests/${id}/posts?page=${page}`),
};

export const postService = {
  getAll: (page = 1, search = '') => 
    client.get(`/posts?page=${page}&search=${search}`),
  getById: (id) => 
    client.get(`/posts/${id}`),
  getTrending: (limit = 5) => 
    client.get(`/posts/trending?limit=${limit}`),
  create: (content, mediaFile = null) => {
    if (mediaFile) {
      const formData = new FormData();
      if (content) {
        formData.append('content', content);
      }
      formData.append('media', mediaFile);
      return client.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return client.post('/posts', { content });
  },
  update: (id, content) => 
    client.put(`/posts/${id}`, { content }),
  delete: (id) => 
    client.delete(`/posts/${id}`),
  toggleLike: (id) => 
    client.post(`/posts/${id}/like`),
};

export const commentService = {
  getByPost: (postId) => 
    client.get(`/comments/${postId}`),
  create: (postId, content, parentId = null) => 
    client.post('/comments', { post_id: postId, content, parent_id: parentId }),
  delete: (id) => 
    client.delete(`/comments/${id}`),
};

export const chatService = {
  getRecent: (limit = 50, groupChatId = null) => {
    const query = groupChatId ? `&group_chat_id=${groupChatId}` : '';
    return client.get(`/messages?limit=${limit}${query}`);
  },
  sendMessage: (content, mediaFile = null, mediaType = null, groupChatId = null) => {
    if (mediaFile) {
      const formData = new FormData();
      if (content) {
        formData.append('content', content);
      }
      formData.append('media', mediaFile);
      if (mediaType) {
        formData.append('media_type', mediaType);
      }
      if (groupChatId) {
        formData.append('group_chat_id', groupChatId);
      }
      return client.post('/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }

    const payload = { content };
    if (groupChatId) {
      payload.group_chat_id = groupChatId;
    }
    return client.post('/messages', payload);
  },
};

export const groupService = {
  getAll: () => client.get('/groups'),
  create: (name, type = 'public', passcode = null) => 
    client.post('/groups', { name, type, passcode }),
  join: (id, passcode = null) => 
    client.post(`/groups/${id}/join`, { passcode }),
  getRequests: (id) => 
    client.get(`/groups/${id}/requests`),
  handleRequest: (id, requestId, status) => 
    client.post(`/groups/${id}/requests/${requestId}/handle`, { status }),
};

export const adminService = {
  verifyKey: (secretKey) => 
    client.post('/admin/auth', { secret_key: secretKey }),
  getStats: () => 
    client.get('/admin/stats'),
  getPosts: (page = 1, search = '') => 
    client.get(`/admin/posts?page=${page}&search=${search}`),
  getComments: (page = 1, search = '') => 
    client.get(`/admin/comments?page=${page}&search=${search}`),
};

export const directMessageService = {
  getConversations: () => client.get('/direct-messages/conversations'),
  getMessages: (receiverId) => client.get(`/direct-messages/${receiverId}`),
  sendMessage: (receiverId, content, mediaFile = null, mediaType = null) => {
    if (mediaFile) {
      const formData = new FormData();
      formData.append('receiver_id', receiverId);
      if (content) {
        formData.append('content', content);
      }
      formData.append('media', mediaFile);
      if (mediaType) {
        formData.append('media_type', mediaType);
      }
      return client.post('/direct-messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }

    const payload = { receiver_id: receiverId };
    if (content) {
      payload.content = content;
    }
    return client.post('/direct-messages', payload);
  },
};
