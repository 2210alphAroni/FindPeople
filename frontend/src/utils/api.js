import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://findpeople-backend.onrender.com',
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;