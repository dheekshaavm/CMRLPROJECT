// src/api/apiClient.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; // If using Expo

// --- IMPORTANT: CONFIGURE YOUR BACKEND IP ADDRESS ---
// For WEB BROWSER on the SAME machine as the backend:
const API_BASE_URL = 'http://localhost:3000/api'; // <<--- CHANGE THIS FOR WEB TESTING

// For iOS simulator with backend on same Mac: 'http://localhost:3000/api'
// For Android emulator with backend on same machine: 'http://10.0.2.2:3000/api'
// For physical device on same Wi-Fi: 'http://YOUR_COMPUTER_WIFI_IP_ADDRESS:3000/api'
// const API_BASE_URL = 'http://192.168.194.248:3000/api'; // This was for device/emulator

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically add the JWT token to requests
apiClient.interceptors.request.use(
  async (config) => {
    // For web, SecureStore won't work. Use localStorage instead.
    // const token = await SecureStore.getItemAsync('adminToken');
    let token = null;
    if (typeof window !== 'undefined') { // Check if running in a browser environment
        token = localStorage.getItem('adminToken');
    } else {
        token = await SecureStore.getItemAsync('adminToken');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;