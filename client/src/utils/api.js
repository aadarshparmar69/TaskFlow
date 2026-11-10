import axios from 'axios';

const getBaseApiUrl = () => {
  const customUrl = import.meta.env.VITE_API_URL;
  // In production or when deployed on Vercel (same-origin), default to relative /api/v1
  if (import.meta.env.PROD && (!customUrl || customUrl.includes('localhost'))) {
    return '/api/v1';
  }
  return customUrl || '/api/v1';
};

const api = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Deferred init so interceptors can access authStore after module graph resolves
const initInterceptors = () => {
  let authStoreModule = null;
  const getAuth = () => {
    if (!authStoreModule) {
      // By the time any request fires the store module will have been loaded
      authStoreModule = import('../stores/authStore');
    }
    return authStoreModule;
  };

  // Request interceptor — attach access token
  api.interceptors.request.use(
    async (config) => {
      try {
        const mod = await getAuth();
        const token = mod.default.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Store not yet available — continue without token
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor — handle 401 with token refresh
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    failedQueue = [];
  };

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        // Don't intercept refresh or login requests
        if (
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/login')
        ) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const newAccessToken = data.data?.accessToken || data.accessToken;

          // Update store
          const mod = await getAuth();
          mod.default.getState().setAccessToken(newAccessToken);

          // Save new refresh token if returned
          const newRefreshToken = data.data?.refreshToken || data.refreshToken;
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);

          const mod = await getAuth();
          mod.default.getState().logout();
          window.location.href = '/login';

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};

// Initialize interceptors immediately
initInterceptors();

// Common request patterns
export const fetcher = (url) => api.get(url).then((res) => res.data);

export const postData = (url, data) => api.post(url, data).then((res) => res.data);

export const patchData = (url, data) => api.patch(url, data).then((res) => res.data);

export const deleteData = (url) => api.delete(url).then((res) => res.data);

export default api;
