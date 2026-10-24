
import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'https://little-steps-dytk.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');

      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
