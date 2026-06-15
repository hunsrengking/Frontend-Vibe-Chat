import axios from 'axios';

// const API_URL = import.meta.env.VITE_API_URL || 'https://vibechat-service.onrender.com/api';
const API_URL = 'https://vibechat-service.onrender.com/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to automatically add Sanctum token to authorization headers
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('guest_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized access
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and let application handle login redirect/refresh
      localStorage.removeItem('guest_token');
      localStorage.removeItem('guest_profile');
    }
    return Promise.reject(error);
  }
);

export default client;
