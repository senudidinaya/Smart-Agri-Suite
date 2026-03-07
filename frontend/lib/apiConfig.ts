export const API_BASE_URL = "http://172.20.10.3:5000/api";

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } catch (error: any) {
        if (error.name === "AbortError") {
            throw new Error("Network request timed out. Please check your connection or try again later.");
        }
        throw error;
    } finally {
        clearTimeout(id);
    }
}
