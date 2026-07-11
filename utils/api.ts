import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { getToken, clearAuth } from './auth';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s timeout for better stability
});

let requestQueue = Promise.resolve();

// Request Interceptor: Auth + Log
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`🚀 [API Request]  ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    } catch (err) {
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Data Unpacking + Error Handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API Response] ${response.status} ${response.config.url}`);
    
    // Safety: If response.data is null or not an object
    if (!response.data || typeof response.data !== 'object') {
      return response.data;
    }

    // Unpack standard Laravel wrapper { success: 1, data: { ... } }
    if ('success' in response.data) {
      if (response.data.success === 1 || response.data.success === true) {
        return response.data.data || response.data;
      } else {
        return Promise.reject({
          message: response.data.message || 'Operation failed',
          response: response
        });
      }
    }
    return response.data;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const message = error.response?.data?.message || error.message;
    
    console.error(`❌ [API Error] ${status || 'Network Error'} ${url}: ${message}`);
    
    if (status === 401) {
      await clearAuth();
    }

    return Promise.reject(error);
  }
);

export default api;
