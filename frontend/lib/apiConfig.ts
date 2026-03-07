import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamic API endpoint for the Smart Pricing & Logistics backend (Node.js on port 5000).
 * Uses the same dynamic IP detection approach as src/config.ts.
 */
const getPricingAPIEndpoint = () => {
  let hostIP = "192.168.1.3"; // Fallback IP

  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.experienceUrl;

    if (hostUri) {
      const rawUrl = (hostUri as string).replace('exp://', '');
      hostIP = rawUrl.split(':')[0];
    } else if (__DEV__ && Platform.OS === 'android') {
      hostIP = "10.0.2.2";
    } else if (__DEV__ && Platform.OS === 'ios') {
      hostIP = "localhost";
    }
  } catch (e) {
    console.warn("Failed to extract dynamic IP for pricing API, using fallback", e);
  }

  return `http://${hostIP}:5000`;
};

export const API_BASE_URL = getPricingAPIEndpoint();

export async function fetchWithTimeout(
  resource: RequestInfo,
  options: RequestInit = {},
  timeout: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);

  return response;
}
