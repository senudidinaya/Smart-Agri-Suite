import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Replace with your machine's IP address if testing on a physical device or if 10.0.2.2 fails.
const HOST_IP = '192.168.1.8';
const BASE_URL = Platform.OS === 'web' ? 'http://localhost:8000/api/v1' : `http://${HOST_IP}:8000/api/v1`;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
