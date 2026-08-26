export const PRODUCTION_API_BASE_URL = "https://moveinrange-api.vercel.app";
export const LOCAL_API_BASE_URL = "http://localhost:8200";

export type MobilePlatform = "ios" | "android" | "web" | string;

export function normalizeApiBaseUrl(value?: string | null, platform: MobilePlatform = "ios") {
  const candidate = (value ?? "").trim();
  const fallback = platform === "web" ? LOCAL_API_BASE_URL : PRODUCTION_API_BASE_URL;
  const base = candidate || fallback;
  if (!/^https?:\/\//.test(base)) return fallback;
  return base.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
}

export function getApiHostname(apiBaseUrl: string) {
  return new URL(apiBaseUrl).hostname;
}
