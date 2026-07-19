import * as SecureStore from "expo-secure-store";
import { TokenStore } from "./storage/tokenStore";

const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8200";
export const API_BASE_URL = configuredBase.replace(/\/api\/v1\/?$/, "");
const API_V1 = `${API_BASE_URL}/api/v1`;
const demoEmail = "demo@moveinrange.local";
const demoPassword = "MoveInRangeLocalDemo!";

const memoryTokens: Record<string, string | null> = { access_token: null, refresh_token: null };

const tokenStore = new TokenStore({
  async getItem(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryTokens[key] ?? null;
    }
  },
  async setItem(key: string, value: string) {
    memoryTokens[key] = value;
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Unsupported runtimes use memory only; this is not durable persistence.
    }
  },
  async deleteItem(key: string) {
    memoryTokens[key] = null;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Unsupported runtimes use memory only; this is not durable persistence.
    }
  }
});

async function storeTokens(payload: { access_token: string; refresh_token: string }) {
  await tokenStore.save(payload);
}

export async function ensureLocalSession() {
  const existing = await tokenStore.loadAccessToken();
  if (existing) return existing;
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

export function logGlucose(sessionId?: string) {
  return apiFetch("/glucose", {
    method: "POST",
    body: JSON.stringify({ value: 112, unit: "mg/dL", timing: "post", session_id: sessionId })
  });
}

export function logDiabetesContext(payload: Record<string, unknown>) {
  return apiFetch("/diabetes/context", { method: "POST", body: JSON.stringify({ payload }) });
}

export function connectProvider(provider_key: string, mock = true) {
  return apiFetch("/integrations/connect", { method: "POST", body: JSON.stringify({ provider_key, mock }) });
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
