import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";

const baseUrl = (process.env.PRODUCT_E2E_API_BASE_URL ?? process.env.API_BASE_URL ?? "").replace(/\/api\/v1\/?$/, "");
const routeFiles = [
  "apps/mobile/app/auth/register.tsx",
  "apps/mobile/app/onboarding.tsx",
  "apps/mobile/app/(tabs)/readiness.tsx",
  "apps/mobile/app/(tabs)/daily-plan.tsx",
  "apps/mobile/app/workout/[sessionId].tsx",
  "apps/mobile/app/workout/[sessionId]/feedback.tsx",
  "apps/mobile/app/diabetes.tsx",
  "apps/mobile/app/calendar.tsx",
  "apps/mobile/app/(tabs)/privacy.tsx"
];

async function api(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  return { response, payload };
}

test("product web-compatible closed beta flow uses real mobile routes and API", async (t) => {
  if (!baseUrl) {
    t.skip("Set PRODUCT_E2E_API_BASE_URL or API_BASE_URL to run product E2E.");
    return;
  }
  mkdirSync("test-results/acceptance", { recursive: true });
  for (const file of routeFiles) assert.equal(existsSync(file), true, file);
  assert.equal((await api("/profile")).response.status, 401);

  const email = `closed-beta-${Date.now()}@example.test`;
  const register = await api("/auth/register", { method: "POST", body: { email, password: "MoveInRange1" } });
  assert.equal(register.response.status, 201, JSON.stringify(register.payload));
  const token = register.payload.access_token;

  const profileBefore = await api("/profile", { token });
  assert.equal(profileBefore.response.status, 200);
  assert.equal(profileBefore.payload.profile.onboarding_complete, false);

  const onboardingSteps = [
    ["preferred_name", { preferredName: "Closed Beta" }],
    ["date_of_birth", { dateOfBirth: "1988-02-29" }],
    ["gender", { gender: "Self-described", selfDescribe: "Closed beta tester" }],
    ["physiological_contexts", { contexts: ["postpartum"], trimester: "" }],
    ["health_conditions", { conditions: ["type 2 diabetes"] }],
    ["sensitivity_regions", { sensitivityRegions: ["knees"], side: "bilateral", severity: "3" }],
    ["clinician_restrictions", { clinicianRestriction: true, prohibitedRegions: ["knees"], prohibitedMovements: ["jump"], prohibitedPositions: ["kneeling"], maxDuration: "20", maxIntensity: "low", noFloor: true, noImpact: true, noOverhead: false, restrictionReviewDate: "2026-08-19" }],
    ["injuries_surgery", { injuryRegion: "knees", injurySide: "bilateral", injuryKind: "injury", injuryType: "sensitivity", injuryDate: "2025-01-10", injuryStatus: "managed", injuryPainSeverity: "3", injuryRomLimitation: "deep flexion", injuryClinicianCleared: true }],
    ["mobility_aids", { mobilityAids: ["brace"], mobilityAidUse: "exercise only", mobilityAidSide: "bilateral" }],
    ["activity_experience", { dailyStepRange: "3000-6000", weeklyExerciseFrequency: "2", lastRegularExerciseDate: "2026-06-01", strengthExperience: "beginner", cardioExperience: "beginner", mobilityExperience: "some experience", balanceExperience: "beginner", sedentaryHours: "7", preferredIntensity: "low" }],
    ["functional_capacity", { chairRise: "comfortable", floorRise: "not today", stairs: "limited", singleLegStanding: "with support", walkingTolerance: "20", prolongedStanding: "15", overheadReach: "comfortable", gripPerception: "comfortable", confidence: "3", capacitySymptoms: ["fatigue"] }],
    ["goals", { goals: ["mobility"], targets: ["core"] }],
    ["target_muscles", { targets: ["core", "glutes"] }],
    ["environment_equipment", { equipment: ["chair", "wall"] }],
    ["schedule_time", { minutes: "15" }],
    ["diabetes_notifications", { diabetesEnabled: true, quietHours: true }],
    ["review_complete", { summary: "Readable closed beta summary" }]
  ];
  for (const [index, [step, payload]] of onboardingSteps.entries()) {
    const saved = await api("/onboarding", { token, method: "PUT", body: { step, payload, completed: index === onboardingSteps.length - 1, language: "en" } });
    assert.equal(saved.response.status, 200, `${step}: ${JSON.stringify(saved.payload)}`);
  }
  const profileAfter = await api("/profile", { token });
  assert.equal(profileAfter.payload.profile.onboarding_complete, true);

  const readinessBody = { energy: 3, sleep_quality: 3, pain: 2, available_minutes: 15, desired_session_type: "mixed", stress: 2 };
  assert.equal((await api("/readiness-checks", { token, method: "POST", body: readinessBody })).response.status, 201);
  const plan = await api("/plans/daily/generate", { token, method: "POST", body: readinessBody });
  assert.equal(plan.response.status, 201, JSON.stringify(plan.payload));
  assert.equal((await api(`/plans/${plan.payload.plan.id}/modify`, { token, method: "POST", body: { intent: "make_easier", request_payload: { reason: "closed beta E2E" } } })).response.status, 200);
  const session = await api("/sessions", { token, method: "POST", body: { plan_id: plan.payload.plan.id, resume: false } });
  assert.equal(session.response.status, 201, JSON.stringify(session.payload));
  const sessionId = session.payload.session.id;
  assert.equal((await api(`/sessions/${sessionId}`, { token, method: "PATCH", body: { status: "paused", elapsed_seconds: 30 } })).response.status, 200);
  assert.equal((await api(`/sessions/${sessionId}`, { token, method: "PATCH", body: { status: "in_progress", elapsed_seconds: 45 } })).response.status, 200);
  assert.equal((await api(`/sessions/${sessionId}/complete`, { token, method: "POST", body: { completed: true, actual_duration: 12, perceived_exertion: 3, enjoyment: 4 } })).response.status, 200);
  assert.equal((await api("/exercise-feedback", { token, method: "POST", body: { payload: { session_id: sessionId, feedback_type: "session_feedback", perceived_exertion: 3, pain: 2 } } })).response.status, 201);
  assert.equal((await api("/glucose", { token, method: "POST", body: { value: 118, unit: "mg/dL", timing: "post", session_id: sessionId, payload: { source: "manual" } } })).response.status, 201);
  assert.equal((await api("/diabetes/context", { token, method: "POST", body: { payload: { timing: "post", value: 118, unit: "mg/dL", source: "manual", session_id: sessionId } } })).response.status, 201);
  assert.equal((await api("/calendar", { token })).response.status, 200);
  assert.equal((await api("/privacy/export-jobs", { token, method: "POST" })).response.status, 201);
  assert.equal((await api("/auth/logout", { token, method: "POST" })).response.status, 200);
  assert.equal((await api("/profile", { token })).response.status, 401);
});
