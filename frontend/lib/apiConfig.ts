import { ML_BASE_URL } from "../config";
export const API_BASE_URL = ML_BASE_URL; // use central ML config

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
