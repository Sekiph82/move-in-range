import * as SecureStore from "expo-secure-store";

const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8200";
export const API_BASE_URL = configuredBase.replace(/\/api\/v1\/?$/, "");
const API_V1 = `${API_BASE_URL}/api/v1`;
const demoEmail = "demo@moveinrange.local";
const demoPassword = "MoveInRangeLocalDemo!";

let memoryToken: string | null = null;
let memoryRefreshToken: string | null = null;

async function secureGet(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return key === "access_token" ? memoryToken : memoryRefreshToken;
  }
}

async function secureSet(key: string, value: string) {
  if (key === "access_token") memoryToken = value;
  if (key === "refresh_token") memoryRefreshToken = value;
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // In tests or unsupported runtimes the in-memory fallback keeps the session usable.
  }
}

async function storeTokens(payload: { access_token: string; refresh_token: string }) {
  await secureSet("access_token", payload.access_token);
  await secureSet("refresh_token", payload.refresh_token);
}

export async function ensureLocalSession() {
  const existing = await secureGet("access_token");
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
    memoryToken = null;
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
