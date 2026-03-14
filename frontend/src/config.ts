import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_ANDROID_DEVICE_IP = process.env.EXPO_PUBLIC_DEV_MACHINE_IP || '192.168.1.3';

const extractHost = (value?: string | null): string | null => {
    if (!value) return null;
    try {
        const stripped = value
            .replace(/^exp:\/\//, '')
            .replace(/^http:\/\//, '')
            .replace(/^https:\/\//, '');
        const host = stripped.split('/')[0]?.split(':')[0];
        return host || null;
    } catch {
        return null;
    }
};

const getAPIEndpoint = () => {
    const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (explicitBaseUrl) {
        console.log('[GATE1] API target selected via EXPO_PUBLIC_API_BASE_URL:', explicitBaseUrl);
        return explicitBaseUrl;
    }

    let hostIP: string | null = null;
    let hostSource = 'fallback';

    try {
        const scriptUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;
        hostIP = extractHost(scriptUrl);
        if (hostIP) {
            hostSource = 'SourceCode.scriptURL';
        }

        if (!hostIP) {
            hostIP = extractHost(Constants.expoConfig?.hostUri);
            if (hostIP) hostSource = 'expoConfig.hostUri';
        }

        if (!hostIP) {
            hostIP = extractHost(Constants.experienceUrl);
            if (hostIP) hostSource = 'experienceUrl';
        }

        if (!hostIP && __DEV__ && Platform.OS === 'android') {
            const isPhysicalDevice = Boolean(Constants.isDevice);
            hostIP = isPhysicalDevice ? DEFAULT_ANDROID_DEVICE_IP : '10.0.2.2';
            hostSource = isPhysicalDevice ? 'android-device-fallback' : 'android-emulator';
        } else if (!hostIP && __DEV__ && Platform.OS === 'ios') {
            hostIP = 'localhost';
            hostSource = 'ios-simulator';
        } else if (!hostIP) {
            hostIP = 'localhost';
            hostSource = 'generic-localhost';
        }

        console.log(`[GATE1] API target host resolved: ${hostIP} (source=${hostSource})`);
    } catch (e) {
        console.warn("Failed to extract dynamic IP, using fallback", e);
        hostIP = Platform.OS === 'android' ? DEFAULT_ANDROID_DEVICE_IP : 'localhost';
        console.log(`[GATE1] API target fallback after exception: ${hostIP}`);
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
