import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
const { OfflineOutbox } = await import("../apps/mobile/src/storage/offlineOutbox.ts");
const { GuidedWorkoutPlayerState } = await import("../apps/mobile/src/workout/workoutPlayer.ts");
const { TokenStore } = await import("../apps/mobile/src/storage/tokenStore.ts");
const { emptyOnboardingDraft, isOnboardingComplete, saveStep, validateOnboardingStep } = await import("../apps/mobile/src/onboarding/onboardingState.ts");
const { ONBOARDING_STEPS, BODY_REGIONS, GENDER_OPTIONS, MOBILITY_AIDS, MOVEMENT_PATTERNS, POSITIONS, validateOnboardingStepPayload } = await import("../apps/mobile/src/features/onboarding/model.ts");
const { loginSchema, registerSchema, resetPasswordSchema, glucoseSchema, inviteSchema } = await import("../apps/mobile/src/features/validation/schemas.ts");
const { resolveWorkoutMedia, scheduleLocalVoiceCues } = await import("../apps/mobile/src/guidance/mediaVoice.ts");
const { canActivateProvider, providerBlockedReason } = await import("../apps/mobile/src/integrations/providerState.ts");
const { paramsFor } = await import("../apps/mobile/src/features/exercises/filters.ts");
const { LOGIN_ROUTE, REGISTER_ROUTE, resolveSessionGate } = await import("../apps/mobile/src/features/auth/sessionGate.ts");

function mirToken(exp) {
  const body = btoa(JSON.stringify({ exp })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `mir.${body}.signature`;
}

function walkMobileFiles(dir = "apps/mobile") {
  const ignored = new Set(["node_modules", ".expo", ".expo-web-export", "dist"]);
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (!ignored.has(entry)) files.push(...walkMobileFiles(path));
      continue;
    }
    if (/\.(tsx?|jsx?|json|cjs|mjs)$/.test(entry)) files.push(path);
  }
  return files;
}

function routeVariantsForFile(file) {
  const route = file
    .replace(/\\/g, "/")
    .replace(/^apps\/mobile\/app\//, "")
    .replace(/\.tsx$/, "");
  if (route === "_layout" || route.endsWith("/_layout")) return [];
  const stripIndex = (value) => value.replace(/\/index$/, "").replace(/^index$/, "");
  const toHref = (value) => `/${value}`.replace(/\/$/, "") || "/";
  const withGroups = toHref(stripIndex(route));
  const publicRoute = toHref(stripIndex(route.split("/").filter((segment) => !/^\(.+\)$/.test(segment)).join("/")));
  return [...new Set([withGroups, publicRoute])];
}

function mobileRoutes() {
  return new Set(walkMobileFiles("apps/mobile/app").filter((file) => file.endsWith(".tsx")).flatMap(routeVariantsForFile));
}

function routePatternMatches(routes, target) {
  if (!target.startsWith("/")) return false;
  if (routes.has(target)) return true;
  const normalizedTarget = target.replace(/\$\{[^}]+\}/g, "__dynamic__");
  for (const route of routes) {
    const pattern = route.replace(/\[[^\]]+\]/g, "__dynamic__");
    if (pattern === normalizedTarget) return true;
    if (normalizedTarget.includes("__dynamic__") && pattern.startsWith(normalizedTarget.split("__dynamic__")[0])) return true;
  }
  return false;
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
    "auth/index.tsx",
    "auth/login.tsx",
    "auth/register.tsx",
    "auth/forgot-password.tsx",
    "auth/reset-password.tsx",
    "auth/reset-password-success.tsx",
    "auth/session-expired.tsx",
    "(tabs)/program.tsx",
    "(tabs)/progress.tsx",
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
});

test("Expo Router SDK 54 auth routes resolve to valid absolute hrefs", () => {
  const routes = mobileRoutes();
  assert.equal(routes.has(LOGIN_ROUTE), true, "login route must be /auth/login");
  assert.equal(routes.has(REGISTER_ROUTE), true, "registration route must be /auth/register");
  assert.equal(routes.has("/auth"), true, "auth index route should resolve to /auth");
  assert.equal(routes.has("/(tabs)"), true, "typed tab group href should resolve for SDK 54");
  assert.equal(routes.has("/"), true, "tab index public route should resolve to /");
  assert.equal(routes.has("/(auth)/login"), false, "auth is not currently a route group");
});

test("mobile hard-coded navigation targets correspond to real Expo Router routes", () => {
  const routes = mobileRoutes();
  const targets = [];
  for (const file of walkMobileFiles()) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/router\.(?:replace|push|navigate)\(\s*(["'`])([^"'`]+)\1/g)) targets.push({ file, target: match[2] });
    for (const match of text.matchAll(/\bhref=\{?\s*(["'`])([^"'`]+)\1/g)) targets.push({ file, target: match[2] });
  }
  const invalid = targets.filter(({ target }) => target.startsWith("/") && !routePatternMatches(routes, target));
  assert.deepEqual(invalid, []);
});

test("auth registration links target register and login routes explicitly", () => {
  const authScreen = readFileSync("apps/mobile/src/features/auth/AuthScreen.tsx", "utf8");
  assert.match(authScreen, /<SecondaryLink href=\{REGISTER_ROUTE\} label="Create an account" \/>/);
  assert.match(authScreen, /<SecondaryLink href=\{LOGIN_ROUTE\} label="Already have an account\? Sign in" \/>/);
  assert.doesNotMatch(authScreen, /label="Create an account"[\s\S]{0,120}LOGIN_ROUTE/);
  assert.doesNotMatch(authScreen, /label="Create an account"[\s\S]{0,120}auth\/login/);
});

test("session gate keeps signed-out auth routes on auth screens", () => {
  assert.deepEqual(resolveSessionGate("/", { hasSession: false, onboardingComplete: false }), { state: "SIGNED_OUT", redirectTo: LOGIN_ROUTE });
  assert.deepEqual(resolveSessionGate("auth/login", { hasSession: false, onboardingComplete: false }), { state: "SIGNED_OUT", redirectTo: undefined });
  assert.deepEqual(resolveSessionGate("/auth/register", { hasSession: false, onboardingComplete: false }), { state: "SIGNED_OUT", redirectTo: undefined });
  assert.deepEqual(resolveSessionGate("/settings", { hasSession: false, onboardingComplete: true }), { state: "SIGNED_OUT", redirectTo: LOGIN_ROUTE });
  assert.deepEqual(resolveSessionGate("/settings", { hasSession: true, onboardingComplete: true, sessionExpired: true }), { state: "SESSION_EXPIRED", redirectTo: LOGIN_ROUTE });
});

test("root layout mounts navigator before session redirects", () => {
  const rootLayout = readFileSync("apps/mobile/app/_layout.tsx", "utf8");
  const sessionGuard = readFileSync("apps/mobile/src/features/auth/SessionGuard.tsx", "utf8");
  assert.match(rootLayout, /<SessionGuard\s*\/>\s*<Stack/s);
  assert.match(sessionGuard, /useRootNavigationState/);
  assert.match(sessionGuard, /if \(!rootNavigationReady\) return/);
  assert.doesNotMatch(rootLayout, /<SessionGuard>\s*<Stack/s);
});

test("product workflow is decomposed into feature-specific screens", () => {
  const workflow = readFileSync("apps/mobile/src/screens/ProductWorkflowScreen.tsx", "utf8");
  assert.ok(workflow.split("\n").length <= 120, "ProductWorkflowScreen must remain a small dispatcher");
  assert.doesNotMatch(workflow, /function renderBody/);
  const featureFiles = [
    "apps/mobile/src/features/onboarding/OnboardingScreen.tsx",
    "apps/mobile/src/features/readiness/ReadinessScreen.tsx",
    "apps/mobile/src/features/plans/PlanScreens.tsx",
    "apps/mobile/src/features/workout/WorkoutScreens.tsx",
    "apps/mobile/src/features/exercises/ExerciseScreens.tsx",
    "apps/mobile/src/features/diabetes/DiabetesScreen.tsx",
    "apps/mobile/src/features/integrations/IntegrationsScreen.tsx",
    "apps/mobile/src/features/privacy/PrivacyScreen.tsx",
    "apps/mobile/src/features/sharing/SharingScreens.tsx",
    "apps/mobile/src/features/shared/ui.tsx"
  ];
  for (const file of featureFiles) assert.equal(existsSync(file), true, file);
  assert.match(readFileSync("apps/mobile/src/features/exercises/ExerciseScreens.tsx", "utf8"), /camera_consent: true/);
  assert.match(readFileSync("apps/mobile/src/features/diabetes/DiabetesScreen.tsx", "utf8"), /not an insulin or treatment recommendation/);
});

test("mobile product shell exposes Home Program Move Progress Profile tabs", () => {
  const tabs = readFileSync("apps/mobile/app/(tabs)/_layout.tsx", "utf8");
  for (const tab of ["Home", "Program", "Move", "Progress", "Profile"]) assert.match(tabs, new RegExp(`title: "${tab}"`));
  assert.match(tabs, /name="program"/);
  assert.match(tabs, /name="progress"/);
  assert.match(tabs, /name="plan" options=\{\{ href: null \}\}/);
  assert.match(tabs, /name="insights" options=\{\{ href: null \}\}/);
});

test("exercise media reaches cards detail and guided player surfaces", () => {
  const mediaFrame = readFileSync("apps/mobile/src/features/shared/ExerciseMediaFrame.tsx", "utf8");
  const planScreens = readFileSync("apps/mobile/src/features/plans/PlanScreens.tsx", "utf8");
  const exerciseScreens = readFileSync("apps/mobile/src/features/exercises/ExerciseScreens.tsx", "utf8");
  const workoutScreens = readFileSync("apps/mobile/src/features/workout/WorkoutScreens.tsx", "utf8");
  assert.match(mediaFrame, /raw_gif_path_present/);
  assert.match(mediaFrame, /Guided fallback|Media pending review/);
  assert.match(planScreens, /<ExerciseMediaFrame/);
  assert.match(exerciseScreens, /<ExerciseMediaFrame/);
  assert.match(workoutScreens, /<ExerciseMediaFrame/);
  assert.match(workoutScreens, /Next:/);
});

test("guided workout screen is state driven and not a debug control stack", () => {
  const workoutScreens = readFileSync("apps/mobile/src/features/workout/WorkoutScreens.tsx", "utf8");
  for (const phase of ["PREPARING", "WORKING", "RESTING", "PAUSED", "SUBSTITUTING", "PAIN_CHECK", "COMPLETING", "COMPLETED"]) {
    assert.match(workoutScreens, new RegExp(`"${phase}"`));
  }
  assert.match(workoutScreens, /Speech\.speak/);
  assert.match(workoutScreens, /Haptics\.impactAsync/);
  assert.match(workoutScreens, /formatClock/);
  assert.match(workoutScreens, /Open full feedback/);
  assert.doesNotMatch(workoutScreens, /Preparation, work, rest, pause, skip, substitute, and completion controls are available/);
});

test("beta validation schemas reject malformed auth, glucose, and sharing payloads", () => {
  assert.equal(loginSchema.safeParse({ email: "bad", password: "", rememberSession: true }).success, false);
  assert.equal(registerSchema.safeParse({
    preferredName: "A",
    email: "user@example.com",
    password: "weak",
    confirmPassword: "different",
    acceptedTerms: false,
    marketingConsent: false
  }).success, false);
  assert.equal(registerSchema.safeParse({
    preferredName: "Aylin",
    email: "user@example.com",
    password: "MoveInRange1",
    confirmPassword: "MoveInRange1",
    acceptedTerms: true,
    marketingConsent: false
  }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ token: "short", password: "MoveInRange1", confirmPassword: "MoveInRange1" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token: "abcdefghijklmnopqrstuvwxyz123456", password: "MoveInRange2", confirmPassword: "MoveInRange2" }).success, true);
  assert.equal(glucoseSchema.safeParse({ timing: "pre", value: "", unit: "mg/dL", trend: "steady", source: "manual" }).success, false);
  assert.equal(glucoseSchema.safeParse({ timing: "post", value: "118", unit: "mg/dL", trend: "steady", source: "manual" }).success, true);
  assert.equal(inviteSchema.safeParse({ email: "helper@example.com", scopes: [], expiryDays: 30 }).success, false);
});

test("beta exercise filters alter the supported API query", () => {
  const params = new URLSearchParams(paramsFor("knee", "upper legs", "chair", "quads", 2));
  assert.equal(params.get("q"), "knee");
  assert.equal(params.get("body_part"), "upper legs");
  assert.equal(params.get("equipment"), "chair");
  assert.equal(params.get("target"), "quads");
  assert.equal(params.get("page"), "2");
  assert.equal(params.get("page_size"), "24");
  assert.equal(params.get("language"), "en");
});

test("session gate protects auth, onboarding, and app routes centrally", () => {
  assert.deepEqual(resolveSessionGate("/daily-plan", { hasSession: false, onboardingComplete: false }), { state: "SIGNED_OUT", redirectTo: LOGIN_ROUTE });
  assert.deepEqual(resolveSessionGate("/daily-plan", { hasSession: true, onboardingComplete: false }), { state: "AUTHENTICATED_ONBOARDING_INCOMPLETE", redirectTo: "/onboarding" });
  assert.deepEqual(resolveSessionGate("/onboarding", { hasSession: true, onboardingComplete: true }), { state: "AUTHENTICATED_READY", redirectTo: "/(tabs)" });
  assert.deepEqual(resolveSessionGate("/daily-plan", { hasSession: true, onboardingComplete: true, offline: true }), { state: "OFFLINE_WITH_VALID_SESSION" });
  assert.deepEqual(resolveSessionGate("/daily-plan", { hasSession: true, onboardingComplete: true, sessionExpired: true }), { state: "SESSION_EXPIRED", redirectTo: LOGIN_ROUTE });
});

test("beta mobile UI does not expose old demo wording or fixed glucose defaults", () => {
  const files = [
    "apps/mobile/src/features/auth/AuthScreen.tsx",
    "apps/mobile/src/features/exercises/ExerciseScreens.tsx",
    "apps/mobile/src/features/diabetes/DiabetesScreen.tsx",
    "apps/mobile/src/features/calendar/CalendarScreen.tsx",
    "apps/mobile/src/features/achievements/AchievementsScreen.tsx"
  ];
  const text = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(text, /Demo session|Mock privacy-first form check|internal fallback pending|achievement_key:|event_type -|value:\s*112/);
  assert.doesNotMatch(text, /not loaded/i);
});

test("real onboarding metadata covers required acceptance steps and validation", () => {
  assert.equal(ONBOARDING_STEPS.length, 22);
  assert.deepEqual(ONBOARDING_STEPS.map((step) => step.en), [
    "Welcome",
    "Product boundary",
    "Consent",
    "Preferred name",
    "Date of birth",
    "Gender",
    "Physiological contexts",
    "Height and weight",
    "Country, timezone, language",
    "Health conditions",
    "Sensitivity regions",
    "Clinician restrictions",
    "Previous injuries and surgery",
    "Mobility aids",
    "Activity and experience",
    "Functional capacity",
    "Goals",
    "Target muscles",
    "Environment and equipment",
    "Schedule and time",
    "Diabetes and notification settings",
    "Review and complete"
  ]);
  assert.deepEqual(GENDER_OPTIONS, ["Woman", "Man", "Non-binary", "Prefer not to say", "Self-described"]);
  assert.equal(BODY_REGIONS.length, 11);
  assert.ok(MOVEMENT_PATTERNS.includes("jump"));
  assert.ok(POSITIONS.includes("kneeling"));
  assert.ok(MOBILITY_AIDS.includes("walker"));
  const baseDraft = {
    language: "en",
    preferredName: "Aylin",
    dateOfBirth: "1982-04-20",
    gender: "Self-described",
    selfDescribe: "",
    contexts: ["pregnancy"],
    trimester: "",
    heightCm: "168",
    weightKg: "72",
    country: "US",
    timezone: "America/New_York",
    conditions: [],
    sensitivityRegions: [],
    side: "bilateral",
    severity: "2",
    clinicianRestriction: false,
    notes: "",
    goals: ["mobility"],
    targets: ["core"],
    equipment: ["chair"],
    minutes: "15",
    diabetesEnabled: false,
    quietHours: true
  };
  assert.deepEqual(validateOnboardingStepPayload("gender", baseDraft), ["self_description_required"]);
  assert.deepEqual(validateOnboardingStepPayload("physiological_contexts", baseDraft), ["trimester_required_when_pregnancy_selected"]);
  assert.deepEqual(validateOnboardingStepPayload("clinician_restrictions", { ...baseDraft, clinicianRestriction: true, restrictionReviewDate: "" }), ["restriction_review_date_required"]);
  assert.deepEqual(validateOnboardingStepPayload("injuries_surgery", { ...baseDraft, injuryRegion: "knees", injuryStatus: "" }), ["injury_status_required"]);
});
