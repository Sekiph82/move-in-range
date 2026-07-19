import * as SecureStore from "expo-secure-store";
import { TokenStore } from "./storage/tokenStore";

const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8200";
export const API_BASE_URL = configuredBase.replace(/\/api\/v1\/?$/, "");
const API_V1 = `${API_BASE_URL}/api/v1`;
const demoEmail = "demo@moveinrange.local";
const demoPassword = "MoveInRangeLocalDemo!";
const enableDemoLogin = process.env.EXPO_PUBLIC_ENABLE_DEMO_LOGIN === "true";

const memoryTokens: Record<string, string | null> = { access_token: null, refresh_token: null };
const webTokenPrefix = "mir_";

function getWebToken(key: string) {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(`${webTokenPrefix}${key}`);
  } catch {
    return null;
  }
}

function setWebToken(key: string, value: string) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(`${webTokenPrefix}${key}`, value);
  } catch {
    // localStorage can be unavailable in privacy-restricted browser contexts.
  }
}

function deleteWebToken(key: string) {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(`${webTokenPrefix}${key}`);
  } catch {
    // localStorage can be unavailable in privacy-restricted browser contexts.
  }
}

export type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: { id: string; email?: string; role?: string; auth_provider?: string };
};

const tokenStore = new TokenStore({
  async getItem(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return getWebToken(key) ?? memoryTokens[key] ?? null;
    }
  },
  async setItem(key: string, value: string) {
    memoryTokens[key] = value;
    setWebToken(key, value);
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Unsupported runtimes use the web/local fallback above.
    }
  },
  async deleteItem(key: string) {
    memoryTokens[key] = null;
    deleteWebToken(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Unsupported runtimes use the web/local fallback above.
    }
  }
});

async function storeTokens(payload: { access_token: string; refresh_token: string }) {
  await tokenStore.save(payload);
}

function normalizeApiError(statusCode: number, payload: string) {
  let code = "";
  try {
    const parsed = JSON.parse(payload) as { detail?: { code?: string } | string; code?: string };
    code = typeof parsed.detail === "object" ? parsed.detail.code ?? "" : parsed.code ?? "";
  } catch {
    code = payload;
  }
  const messages: Record<string, string> = {
    account_disabled: "This account is disabled. Contact support if you believe this is a mistake.",
    email_exists: "An account with this email already exists.",
    expired_token: "Your session expired. Sign in again to continue.",
    invalid_credentials: "Email or password is incorrect.",
    invalid_refresh: "Your session expired. Sign in again to continue.",
    invalid_reset_token: "This reset link is invalid or expired.",
    rate_limited: "Too many attempts. Wait a moment and try again.",
    revoked_token: "Your session expired. Sign in again to continue.",
    session_expired: "Your session expired. Sign in again to continue.",
    weak_password: "Use at least 10 characters with uppercase, lowercase, and a number."
  };
  return messages[code] ?? (statusCode >= 500 ? "MoveInRange is temporarily unavailable." : "The request could not be completed.");
}

function requireAuthTokenResponse(payload: unknown): AuthTokenResponse {
  const value = payload as Partial<AuthTokenResponse>;
  if (!value || typeof value.access_token !== "string" || typeof value.refresh_token !== "string" || value.token_type !== "bearer" || !value.user?.id) {
    throw new Error("Authentication response was incomplete. Try again.");
  }
  return value as AuthTokenResponse;
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_V1}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => null);
  if (!response) throw new Error("API unavailable. Check your connection and try again.");
  if (!response.ok) {
    const text = await response.text();
    throw new Error(normalizeApiError(response.status, text));
  }
  return response.json();
}

async function authTokenRequest(path: string, body: Record<string, unknown>) {
  const payload = requireAuthTokenResponse(await postJson(path, body));
  await storeTokens(payload);
  return payload;
}

export function registerUser(payload: { email: string; password: string; preferredName: string; marketingConsent?: boolean }) {
  return authTokenRequest("/auth/register", { email: payload.email, password: payload.password, preferred_name: payload.preferredName, marketing_consent: Boolean(payload.marketingConsent) });
}

export function loginUser(payload: { email: string; password: string }) {
  return authTokenRequest("/auth/login", payload);
}

export async function refreshSession() {
  const refresh_token = await tokenStore.loadRefreshToken();
  if (!refresh_token) return null;
  try {
    return await authTokenRequest("/auth/refresh", { refresh_token });
  } catch {
    await tokenStore.clear();
    return null;
  }
}

export function requestPasswordReset(email: string) {
  return postJson("/auth/forgot-password", { email }) as Promise<{ accepted: boolean; message: string; development_reset_token?: string; development_reset_link?: string }>;
}

export function validatePasswordResetToken(token: string) {
  return postJson("/auth/reset-password/validate", { token }) as Promise<{ valid: boolean; expires_at: string }>;
}

export function resetPassword(payload: { token: string; password: string }) {
  return postJson("/auth/reset-password", payload) as Promise<{ reset: boolean }>;
}

export async function restoreSession() {
  const existing = await tokenStore.loadAccessToken();
  if (existing) return existing;
  const refreshed = await refreshSession();
  return refreshed?.access_token ?? null;
}

export async function getSessionSnapshot() {
  const token = await restoreSession();
  if (!token) return { hasSession: false, onboardingComplete: false };
  try {
    const response = await fetch(`${API_V1}/profile`, { headers: { authorization: `Bearer ${token}` } });
    if (response.status === 401 || response.status === 403) {
      await tokenStore.clear();
      return { hasSession: false, onboardingComplete: false, sessionExpired: true };
    }
    if (!response.ok) return { hasSession: true, onboardingComplete: false, offline: true };
    const profile = await response.json();
    return { hasSession: true, onboardingComplete: Boolean(profile.profile?.onboarding_complete) };
  } catch {
    return { hasSession: true, onboardingComplete: false, offline: true };
  }
}

export async function logoutUser() {
  const token = await tokenStore.loadAccessToken();
  if (token) {
    await fetch(`${API_V1}/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    }).catch(() => null);
  }
  await tokenStore.clear();
}

export async function ensureLocalSession() {
  const restored = await restoreSession();
  if (restored) return restored;
  if (!enableDemoLogin) {
    throw new Error("Please sign in before continuing.");
  }
  const credentials = { email: demoEmail, password: demoPassword };
  let response = await fetch(`${API_V1}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentials)
  });
  if (response.status === 401) {
    response = await fetch(`${API_V1}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials)
    });
  }
  if (!response.ok) throw new Error(`Authentication failed (${response.status})`);
  const payload = await response.json();
  await storeTokens(payload);
  return payload.access_token as string;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await ensureLocalSession();
  const response = await fetch(`${API_V1}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(options.headers ?? {})
    }
  });
  if (response.status === 401) {
    await tokenStore.clear();
    throw new Error("Session expired. Please retry after signing in again.");
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const defaultReadiness = {
  energy: 3,
  sleep_quality: 3,
  pain: 2,
  new_injury: false,
  dizziness: false,
  chest_discomfort: false,
  unusual_shortness_of_breath: false,
  illness: false,
  recent_fall: false,
  available_minutes: 15,
  desired_session_type: "mixed",
  stress: 2
};

export function saveProfile(language: "en" | "tr") {
  return apiFetch("/profile", {
    method: "PUT",
    body: JSON.stringify({
      preferred_name: "Aylin",
      country: language === "tr" ? "TR" : "US",
      timezone: language === "tr" ? "Europe/Istanbul" : "America/New_York",
      language,
      conditions: ["type_2_diabetes", "knee_sensitivity"],
      sensitivities: { knee: { bilateral: true, severity: 3 } },
      equipment: ["body weight", "chair"],
      preferred_training_days: ["Mon", "Wed", "Fri"],
      goals: ["mobility", "consistency"],
      medical_clearance: "cleared",
      consent_accepted: true,
      diabetes: { enabled: true, unit: "mg/dL", exercise_glucose_logging: true },
      onboarding_complete: true
    })
  });
}

export function saveOnboardingStep(step: string, payload: Record<string, unknown>, completed = true, language: "en" | "tr" = "en") {
  return apiFetch("/onboarding", { method: "PUT", body: JSON.stringify({ step, payload, completed, language }) });
}

export function recordConsent(consent_type: string, granted: boolean, evidence: Record<string, unknown> = {}) {
  return apiFetch("/consents", { method: "POST", body: JSON.stringify({ consent_type, granted, version: "consent-2026-07", evidence }) });
}

export function saveCapacityProfile(payload: Record<string, unknown>) {
  return apiFetch("/capacity-profile", { method: "PUT", body: JSON.stringify({ payload }) });
}

export function saveGoalsTargets(goals: string[], target_focuses: string[], natural_request?: string) {
  return apiFetch("/goals-targets", { method: "PUT", body: JSON.stringify({ goals, target_focuses, natural_request }) });
}

export function submitReadiness() {
  return apiFetch("/readiness-checks", { method: "POST", body: JSON.stringify(defaultReadiness) });
}

export function generateDailyPlan(minutes = 15) {
  return apiFetch("/plans/daily/generate", { method: "POST", body: JSON.stringify({ ...defaultReadiness, available_minutes: minutes }) });
}

export function generateWeeklyPlan() {
  return apiFetch("/plans/weekly/generate", { method: "POST", body: JSON.stringify({}) });
}

export function generateMonthlyPlan() {
  return apiFetch("/plans/monthly/generate", { method: "POST", body: JSON.stringify({}) });
}

export function generateAdvancedPlan(payload: Record<string, unknown>) {
  return apiFetch("/plans/advanced/generate", { method: "POST", body: JSON.stringify(payload) });
}

export function createQuickSession(payload: Record<string, unknown>) {
  return apiFetch("/quick-session", { method: "POST", body: JSON.stringify(payload) });
}

export function modifyPlan(planId: string, intent: string, request_payload: Record<string, unknown> = {}) {
  return apiFetch(`/plans/${planId}/modify`, { method: "POST", body: JSON.stringify({ intent, request_payload }) });
}

export function startSession(planId?: string) {
  return apiFetch<{ session: { id: string } }>("/sessions", { method: "POST", body: JSON.stringify({ plan_id: planId, resume: true }) });
}

export function patchSession(sessionId: string, payload: Record<string, unknown>) {
  return apiFetch(`/sessions/${sessionId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function completeSession(sessionId: string) {
  return apiFetch(`/sessions/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify({ completed: true, actual_duration: 15, perceived_exertion: 3, enjoyment: 4 })
  });
}

export function reportPain(sessionId: string) {
  return apiFetch(`/sessions/${sessionId}/pain`, {
    method: "POST",
    body: JSON.stringify({ location: "knee", severity: 4, idempotency_key: `pain-${Date.now()}` })
  });
}

export function recordExerciseFeedback(sessionId: string) {
  return apiFetch("/exercise-feedback", {
    method: "POST",
    body: JSON.stringify({ payload: { session_id: sessionId, feedback_type: "exercise_feedback", exertion: 3, pain_change: "same", notes: "closed beta UI feedback" } })
  });
}

export function logGlucose(payload: { value: number; unit: "mg/dL" | "mmol/L"; timing: "pre" | "post" | "delayed"; session_id?: string }) {
  return apiFetch("/glucose", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logDiabetesContext(payload: Record<string, unknown>) {
  return apiFetch("/diabetes/context", { method: "POST", body: JSON.stringify({ payload }) });
}

export function connectProvider(provider_key: string, mock = true) {
  return apiFetch("/integrations/connect", { method: "POST", body: JSON.stringify({ provider_key, mock }) });
}

export function favoriteExercise(exerciseId: string) {
  return apiFetch(`/exercises/${exerciseId}/favorite`, { method: "POST" });
}

export function saveNotificationPreference(category: string, enabled: boolean) {
  return apiFetch("/notification-preferences", { method: "PUT", body: JSON.stringify({ category, enabled }) });
}

export function requestDataExport() {
  return apiFetch("/privacy/export-jobs", { method: "POST" });
}

export function inviteCaregiver(email: string, scopes: string[]) {
  return apiFetch("/caregivers/invite", { method: "POST", body: JSON.stringify({ email, scopes }) });
}

export function inviteProfessional(email: string, role: string, scopes: string[]) {
  return apiFetch("/professionals/invite", { method: "POST", body: JSON.stringify({ email, role, scopes }) });
}

export function analyzeCameraMock(payload: Record<string, unknown>) {
  return apiFetch("/camera/analyze", { method: "POST", body: JSON.stringify({ payload }) });
}
