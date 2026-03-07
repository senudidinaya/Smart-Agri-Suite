export const API_BASE_URL = "http://172.20.10.3:8000"; // fallback URL

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
