import { resolveBackendBaseUrl } from "./shared/backendUrl";

const mergedBackend = resolveBackendBaseUrl({
    explicitUrlEnvName: "EXPO_PUBLIC_API_BASE_URL",
    fallbackHostEnvName: "EXPO_PUBLIC_DEV_SERVER_HOST",
    fallbackHost: "172.20.10.14",
    port: 8000,
});

if (__DEV__) {
    console.info(`[MergedAPI] Base URL resolved to ${mergedBackend.baseUrl} via ${mergedBackend.source}`);
    if (mergedBackend.warning) {
        console.warn(`[MergedAPI] ${mergedBackend.warning}`);
    }
}

export const API_BASE_URL = mergedBackend.baseUrl;
export const AUTH_API_BASE_URL = `${API_BASE_URL}/api/v1`;
export const API_BASE_URL_SOURCE = mergedBackend.source;
