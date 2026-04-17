import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { getToken, clearAuth } from './auth';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request Interceptor: Log every outgoing request and add Auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log('Payload:', JSON.stringify(config.data, null, 2));
    }
    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Log every incoming response
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error(`❌ [API Error] ${error.response?.status || 'Network Error'} ${error.config?.url}`);
    
    if (error.response?.status === 401) {
      await clearAuth();
    }

    if (error.response?.data) console.log('Error Data:', error.response.data);
    return Promise.reject(error);
  }
);

export default api;
