import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  // 5 min — accommodates large file uploads (PDFs, banners) over slow links.
  // Regular CRUD calls still finish in <1s, so this only matters for slow paths.
  timeout: 5 * 60 * 1000,
  // Allow large multipart uploads from the admin panel
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hy_token');
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
