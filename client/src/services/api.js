import axios from 'axios';
export const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const api = axios.create({
  baseURL: `${API}/api`,
  timeout: 8000
});
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default api;
