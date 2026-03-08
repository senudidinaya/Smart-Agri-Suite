
import axios from 'axios';
import { Platform } from 'react-native';

// Use the current machine's local IP address from ipconfig (192.168.63.37)
const BASE_URL = 'http://192.168.63.37:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Predictions
  predict: (data: { spice: string; region: string; available_stock: number; date?: string; is_festival?: boolean }) => 
    api.post('/api/predict', data),
  
  rangeForecast: (data: { start_date: string; end_date: string; spice: string; region: string; is_festival?: boolean }) => 
    api.post('/api/range-forecast', data),

  // Inventory
  getInventory: () => api.get('/api/inventory'),
  saveInventory: (data: any[]) => api.post('/api/inventory', data),

  // Marketplace
  getMarketplace: () => api.get('/api/marketplace'),

  // Alerts
  getAlerts: () => api.get('/api/alerts'),
};

export default api;
