import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getAPIEndpoint = () => {
    // Dynamically retrieve the laptop's local IP address from Expo Go running in LAN mode.
    // This allows you to freely switch Wi-Fi networks and the app will automatically route back to the backend.

    let hostIP = "192.168.1.3"; // Fallback IP

    try {
        const hostUri = Constants.expoConfig?.hostUri || Constants.experienceUrl;

        if (hostUri) {
            // Strip out 'exp://' if present and extract just the IP
            const rawUrl = hostUri.replace('exp://', '');
            hostIP = rawUrl.split(':')[0];
        } else if (__DEV__ && Platform.OS === 'android') {
            hostIP = "10.0.2.2"; // Android emulator localhost
        } else if (__DEV__ && Platform.OS === 'ios') {
            hostIP = "localhost"; // iOS simulator localhost
        }
    } catch (e) {
        console.warn("Failed to extract dynamic IP, using fallback", e);
    }

    return `http://${hostIP}:8000`;
};

export const API_BASE_URL = getAPIEndpoint();
export const AUTH_API_BASE_URL = `${API_BASE_URL}/api/v1`;
export const CULTIVATOR_API_BASE_URL = AUTH_API_BASE_URL.replace('/api/v1', '');
export const EXPO_PUBLIC_AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

// === AGORA RUNTIME DIAGNOSTICS ===
export const AGORA_DEBUG = true; // Set to false after debugging

// === RUNTIME DIAGNOSTICS (Temporary) ===
console.log('=== NETWORK CONFIGURATION ===');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('AUTH_API_BASE_URL:', AUTH_API_BASE_URL);
console.log('CULTIVATOR_API_BASE_URL:', CULTIVATOR_API_BASE_URL);
console.log('==========================');

if (AGORA_DEBUG) {
  console.log('=== AGORA DEBUG MODE ENABLED ===');
  console.log('Platform:', Platform.OS);
  console.log('EXPO_PUBLIC_AGORA_APP_ID:', EXPO_PUBLIC_AGORA_APP_ID ? 'SET' : 'NOT SET');
  console.log('==============================');
}
