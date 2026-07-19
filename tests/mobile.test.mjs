import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const { OfflineOutbox } = await import("../apps/mobile/src/storage/offlineOutbox.ts");
const { GuidedWorkoutPlayerState } = await import("../apps/mobile/src/workout/workoutPlayer.ts");
const { TokenStore } = await import("../apps/mobile/src/storage/tokenStore.ts");
const { emptyOnboardingDraft, isOnboardingComplete, saveStep, validateOnboardingStep } = await import("../apps/mobile/src/onboarding/onboardingState.ts");
const { resolveWorkoutMedia, scheduleLocalVoiceCues } = await import("../apps/mobile/src/guidance/mediaVoice.ts");
const { canActivateProvider, providerBlockedReason } = await import("../apps/mobile/src/integrations/providerState.ts");

function mirToken(exp) {
  const body = btoa(JSON.stringify({ exp })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `mir.${body}.signature`;
}

test("offline queue never silently discards pending health records", () => {
  const outbox = new OfflineOutbox("user-a");
  const item = outbox.enqueue("glucose", { value: 110, unit: "mg/dL" });
  outbox.markFailed(item.id, "network");
  assert.equal(outbox.pending().length, 1);
  assert.equal(outbox.pending()[0].lastError, "network");
  assert.equal(outbox.queueCount(), 1);
});

test("offline queue isolates pending items by account and uses capped retry timing", () => {
  let now = 1000;
  const outbox = new OfflineOutbox("user-a", () => now);
  const item = outbox.enqueue("workout_event", { session_id: "a" });
  outbox.markFailed(item.id, "offline");
  assert.equal(outbox.retryDue().length, 0);
  now += 3000;
  assert.equal(outbox.retryDue().length, 1);
  outbox.switchAccount("user-b");
  assert.equal(outbox.pending().length, 0);
  outbox.enqueue("glucose", { value: 120 });
  assert.equal(outbox.queueCount(), 1);
  outbox.switchAccount("user-a");
  assert.equal(outbox.queueCount(), 1);
});

test("pain flow pauses and offers substitution or stop", () => {
  const player = new GuidedWorkoutPlayerState();
  const action = player.reportPain("knee", 5);
  assert.equal(player.isPaused, true);
  assert.equal(action, "offer_approved_substitution");
});

test("workout timer excludes paused time and resumes from accumulated elapsed seconds", () => {
  let now = 0;
  const player = new GuidedWorkoutPlayerState(() => now);
  now = 2500;
  assert.equal(player.elapsedSeconds, 2);
  player.pause();
  now = 10000;
  assert.equal(player.elapsedSeconds, 2);
  assert.equal(player.resume(), true);
  now = 12500;
  assert.equal(player.elapsedSeconds, 4);
});

test("symptom flow invalidates active timer until a new readiness flow starts", () => {
  let now = 0;
  const player = new GuidedWorkoutPlayerState(() => now);
  now = 3000;
  const action = player.reportSymptoms(["dizziness"]);
  assert.equal(action, "stop_and_show_safety_flow");
  assert.equal(player.timerInvalidated, true);
  assert.equal(player.elapsedSeconds, 3);
  now = 15000;
  assert.equal(player.resume(), false);
  assert.equal(player.elapsedSeconds, 3);
});

test("workout snapshot restores active state without duplicate completion", () => {
  let now = 0;
  const player = new GuidedWorkoutPlayerState(() => now);
  now = 4000;
  player.skip();
  assert.equal(player.recordCompletionSubmitted("complete-1"), true);
  assert.equal(player.recordCompletionSubmitted("complete-1"), false);
  const snapshot = player.snapshot("session-1");
  now = 9000;
  const restored = GuidedWorkoutPlayerState.restore(snapshot, () => now);
  assert.equal(restored.currentIndex, 1);
  assert.equal(restored.elapsedSeconds, 4);
  assert.equal(restored.recordCompletionSubmitted("complete-1"), false);
});

test("stopped symptom snapshots do not resume normally after restart", () => {
  const player = new GuidedWorkoutPlayerState(() => 1000);
  player.reportSymptoms(["faintness"]);
  const restored = GuidedWorkoutPlayerState.restore(player.snapshot("session-2"), () => 2000);
  assert.equal(restored.timerInvalidated, true);
  assert.equal(restored.resume(), false);
});

test("token store restores valid access tokens and rejects expired or invalid stored values", async () => {
  const values = new Map();
  const store = new TokenStore({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
    deleteItem: async (key) => values.delete(key)
  });
  await store.save({ access_token: mirToken(200), refresh_token: "refresh-one" });
  assert.equal(await store.loadAccessToken(100_000), values.get("access_token"));
  assert.equal(await store.loadRefreshToken(), "refresh-one");
  await store.save({ access_token: mirToken(50), refresh_token: "refresh-two" });
  assert.equal(await store.loadAccessToken(100_000), null);
  await store.save({ access_token: "not-a-token", refresh_token: "refresh-three" });
  assert.equal(await store.loadAccessToken(100_000), null);
  await store.clear();
  assert.equal(await store.loadRefreshToken(), null);
});

test("token store treats corrupted storage as signed out", async () => {
  const store = new TokenStore({
    getItem: async () => { throw new Error("corrupt"); },
    setItem: async () => { throw new Error("corrupt"); },
    deleteItem: async () => {}
  });
  assert.equal(await store.loadAccessToken(), null);
  assert.equal(await store.loadRefreshToken(), null);
});

test("onboarding draft validates required identity and consent fields before completion", () => {
  assert.deepEqual(validateOnboardingStep("identity", { preferred_name: "Aylin" }), ["date_of_birth_required", "timezone_required", "language_required"]);
  let draft = emptyOnboardingDraft("tr");
  draft = saveStep(draft, "identity", { preferred_name: "Aylin", date_of_birth: "1982-04-20", timezone: "Europe/Istanbul", language: "tr" });
  draft = saveStep(draft, "health_profile", { conditions: ["type_2_diabetes"] });
  draft = saveStep(draft, "goals", { goals: ["mobility"], target_focuses: ["core"] });
  draft = saveStep(draft, "capacity", { single_leg_stand: "low", balance_support_requirement: true });
  assert.equal(isOnboardingComplete(draft), false);
  draft = saveStep(draft, "consent", { wellness_limitations: true, health_data_processing: true });
  assert.equal(isOnboardingComplete(draft), true);
});

test("voice scheduler and media resolver use safe fallbacks", () => {
  const cues = scheduleLocalVoiceCues([{ name: "Chair march", durationSeconds: 40, restSeconds: 20 }], "essential_cues", "tr");
  assert.equal(cues.some((cue) => cue.text === "Agri varsa dur"), true);
  const media = resolveWorkoutMedia({ id: "exercise-1", media: { license_status: "external_terms_required" } });
  assert.equal(media.sourceType, "internal_silhouette_animation");
  assert.equal(media.prefetchPolicy, "current_and_next_only");
});

test("provider state reports activation blockers honestly", () => {
  const dexcom = { key: "dexcom", category: "cgm", status: "blocked_credentials", scopes: ["glucose:read"] };
  const nightscout = { key: "nightscout", category: "cgm", status: "mock_ready", scopes: ["glucose:read"] };
  assert.equal(canActivateProvider(dexcom), false);
  assert.equal(providerBlockedReason(dexcom), "Developer account or API credentials are required.");
  assert.equal(canActivateProvider(nightscout), true);
  assert.equal(providerBlockedReason(nightscout), null);
});

test("Expo Router exposes the functional product route family", () => {
  const routes = [
    "auth.tsx",
    "onboarding.tsx",
    "readiness.tsx",
    "quick-session.tsx",
    "daily-plan.tsx",
    "weekly-plan.tsx",
    "monthly-plan.tsx",
    "calendar.tsx",
    "exercises.tsx",
    "exercise/[id].tsx",
    "workout/[sessionId].tsx",
    "workout/[sessionId]/pain.tsx",
    "workout/[sessionId]/symptom.tsx",
    "workout/[sessionId]/feedback.tsx",
    "diabetes.tsx",
    "integrations.tsx",
    "notifications.tsx",
    "privacy.tsx",
    "caregivers.tsx",
    "professionals.tsx",
    "achievements.tsx",
    "settings.tsx"
  ];
  for (const route of routes) {
    assert.equal(existsSync(`apps/mobile/app/${route}`), true, route);
  }
  const workflow = readFileSync("apps/mobile/src/screens/ProductWorkflowScreen.tsx", "utf8");
  assert.match(workflow, /const onboardingSteps = \[/);
  const steps = workflow.match(/const onboardingSteps = \[([\s\S]*?)\];/)?.[1] ?? "";
  assert.equal(steps.split("\n").filter((line) => line.trim().startsWith("\"")).length, 22);
  assert.match(workflow, /camera_consent: true/);
  assert.match(workflow, /does not change medication guidance/);
});
