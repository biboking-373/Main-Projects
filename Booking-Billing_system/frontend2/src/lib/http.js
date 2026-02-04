import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3130';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add any needed headers
api.interceptors.request.use(
  (config) => {
    // You can add authorization headers here if using JWT
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any stored user data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // Don't redirect if we're on a public page
      const publicRoutes = ['/', '/login', '/signup', '/forgot-password'];
      const currentRoute = window.location.hash.replace('#', '');
      
      if (!publicRoutes.includes(currentRoute) && 
          !currentRoute.includes('/login') &&
          !currentRoute.includes('/signup')) {
        // Only redirect if we're trying to access protected area
        setTimeout(() => {
          window.location.href = '/#/login';
        }, 100);
      }
    }
    
    // Return the error so components can handle it
    return Promise.reject(error);
  }
);

export default api;