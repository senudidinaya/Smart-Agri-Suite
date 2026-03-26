import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getAPIEndpoint = () => {
    // Dynamically retrieve the laptop's local IP address from Expo Go running in LAN mode.
    // This allows you to freely switch Wi-Fi networks and the app will automatically route back to the backend.

    let hostIP = "172.20.10.14"; // Fallback IP

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
