import Constants from "expo-constants";

const env = (globalThis as any)?.process?.env ?? {};

export interface BackendUrlResolution {
  baseUrl: string;
  source: string;
  host: string;
  warning?: string;
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function extractHost(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const withoutScheme = trimmed.replace(/^[a-z]+:\/\//i, "");
  const withoutPath = withoutScheme.split("/")[0];
  const withoutQuery = withoutPath.split("?")[0];

  if (!withoutQuery) {
    return null;
  }

  if (withoutQuery.includes(":")) {
    return withoutQuery.split(":")[0] || null;
  }

  return withoutQuery || null;
}

function getHostCandidates(): Array<{ source: string; value?: string }> {
  return [
    { source: "EXPO_PUBLIC_DEV_SERVER_HOST", value: env.EXPO_PUBLIC_DEV_SERVER_HOST as string | undefined },
    { source: "Constants.expoConfig.hostUri", value: Constants.expoConfig?.hostUri as string | undefined },
    { source: "Constants.manifest2.extra.expoClient.hostUri", value: (Constants as any)?.manifest2?.extra?.expoClient?.hostUri as string | undefined },
    { source: "Constants.manifest.debuggerHost", value: (Constants as any)?.manifest?.debuggerHost as string | undefined },
    { source: "Constants.experienceUrl", value: (Constants as any)?.experienceUrl as string | undefined },
  ];
}

export function resolveBackendBaseUrl(options: {
  explicitUrlEnvName: string;
  fallbackHostEnvName?: string;
  fallbackHost: string;
  port: number;
}): BackendUrlResolution {
  const explicitUrl = env[options.explicitUrlEnvName] as string | undefined;
  if (explicitUrl?.trim()) {
    const baseUrl = normalizeBaseUrl(explicitUrl);
    return {
      baseUrl,
      host: extractHost(baseUrl) || "unknown",
      source: options.explicitUrlEnvName,
    };
  }

  for (const candidate of getHostCandidates()) {
    const host = candidate.value ? extractHost(candidate.value) : null;
    if (host) {
      return {
        baseUrl: `http://${host}:${options.port}`,
        host,
        source: candidate.source,
      };
    }
  }

  const fallbackHostFromEnv = options.fallbackHostEnvName
    ? (env[options.fallbackHostEnvName] as string | undefined)?.trim()
    : undefined;
  const fallbackHost = fallbackHostFromEnv || options.fallbackHost;

  return {
    baseUrl: `http://${fallbackHost}:${options.port}`,
    host: fallbackHost,
    source: fallbackHostFromEnv ? options.fallbackHostEnvName! : "hardcoded-fallback",
    warning:
      "Host could not be inferred from Expo runtime metadata. Using fallback host; set explicit EXPO_PUBLIC_* base URLs for physical-device reliability.",
  };
}
