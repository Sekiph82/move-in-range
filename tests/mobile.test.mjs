import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
const { OfflineOutbox } = await import("../apps/mobile/src/storage/offlineOutbox.ts");
const { GuidedWorkoutPlayerState } = await import("../apps/mobile/src/workout/workoutPlayer.ts");
const { TokenStore } = await import("../apps/mobile/src/storage/tokenStore.ts");
const { emptyOnboardingDraft, isOnboardingComplete, saveStep, validateOnboardingStep } = await import("../apps/mobile/src/onboarding/onboardingState.ts");
const { ONBOARDING_STEPS, BODY_AREAS, onboardingDraftFromProfile, onboardingNeedsBodyAreas, onboardingPayload, validateOnboardingStepPayload } = await import("../apps/mobile/src/features/onboarding/model.ts");
const { loginSchema, registerSchema, resetPasswordSchema, glucoseSchema, inviteSchema } = await import("../apps/mobile/src/features/validation/schemas.ts");
const { resolveWorkoutMedia, scheduleLocalVoiceCues } = await import("../apps/mobile/src/guidance/mediaVoice.ts");
const { canActivateProvider, providerBlockedReason } = await import("../apps/mobile/src/integrations/providerState.ts");
const { paramsFor } = await import("../apps/mobile/src/features/exercises/filters.ts");
const { LOGIN_ROUTE, REGISTER_ROUTE, resolveSessionGate } = await import("../apps/mobile/src/features/auth/sessionGate.ts");
const { LOCAL_API_BASE_URL, PRODUCTION_API_BASE_URL, getApiHostname, normalizeApiBaseUrl } = await import("../apps/mobile/src/apiConfig.ts");

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
  const pathOnlyTarget = target.split("?")[0];
  if (routes.has(pathOnlyTarget)) return true;
  const normalizedTarget = pathOnlyTarget.replace(/\$\{[^}]+\}/g, "__dynamic__");
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
    "(tabs)/readiness.tsx",
    "quick-session.tsx",
    "(tabs)/daily-plan.tsx",
    "(tabs)/weekly-plan.tsx",
    "(tabs)/monthly-plan.tsx",
    "calendar.tsx",
    "(tabs)/exercises.tsx",
    "(tabs)/exercise/[id].tsx",
    "workout/[sessionId].tsx",
    "workout/[sessionId]/pain.tsx",
    "workout/[sessionId]/symptom.tsx",
    "workout/[sessionId]/feedback.tsx",
    "diabetes.tsx",
    "integrations.tsx",
    "notifications.tsx",
    "(tabs)/privacy.tsx",
    "caregivers.tsx",
    "professionals.tsx",
    "achievements.tsx",
    "(tabs)/settings.tsx"
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

test("mobile API base URL resolves to production for native physical-device runtimes", () => {
  const appConfig = JSON.parse(readFileSync("apps/mobile/app.json", "utf8"));
  const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
  assert.equal(PRODUCTION_API_BASE_URL, "https://moveinrange-api.vercel.app");
  assert.equal(appConfig.expo.extra.apiBaseUrl, PRODUCTION_API_BASE_URL);
  assert.equal(normalizeApiBaseUrl("", "ios"), PRODUCTION_API_BASE_URL);
  assert.equal(normalizeApiBaseUrl(undefined, "android"), PRODUCTION_API_BASE_URL);
  assert.equal(normalizeApiBaseUrl("not-a-url", "ios"), PRODUCTION_API_BASE_URL);
  assert.equal(normalizeApiBaseUrl(`${PRODUCTION_API_BASE_URL}/api/v1/`, "ios"), PRODUCTION_API_BASE_URL);
  assert.equal(normalizeApiBaseUrl(null, "web"), LOCAL_API_BASE_URL);
  assert.equal(getApiHostname(PRODUCTION_API_BASE_URL), "moveinrange-api.vercel.app");
  assert.equal("EXPO_PUBLIC_API_BASE_URL" in eas.build.preview.env, false);
  assert.equal("EXPO_PUBLIC_API_BASE_URL" in eas.build.production.env, false);
});

test("mobile API client probes health and classifies connectivity failures", () => {
  const api = readFileSync("apps/mobile/src/api.ts", "utf8");
  const rootLayout = readFileSync("apps/mobile/app/_layout.tsx", "utf8");
  assert.match(api, /Constants\.expoConfig\?\.extra\?\.apiBaseUrl/);
  assert.match(api, /process\.env\.EXPO_PUBLIC_API_BASE_URL \|\| expoConfiguredBase/);
  assert.match(api, /fetchWithTimeout/);
  assert.match(api, /AbortController/);
  assert.match(api, /new ApiClientError\("timeout"/);
  assert.match(api, /new ApiClientError\("offline"/);
  assert.match(api, /typeof parsed\.detail === "string" \? parsed\.detail/);
  assert.match(api, /code === "invalid_credentials" \? "invalid_credentials"/);
  assert.match(api, /`\$\{API_V1\}\/health`/);
  assert.match(rootLayout, /probeApiHealth\(4000\)/);
  assert.match(rootLayout, /logDevelopmentApiDiagnostics\("ok"\)/);
  assert.match(rootLayout, /logDevelopmentApiDiagnostics\("failed"\)/);
  assert.doesNotMatch(api, /API unavailable\. Check your connection and try again\./);
});

test("mobile API client uses operation-specific timeouts for generation", () => {
  const api = readFileSync("apps/mobile/src/api.ts", "utf8");
  const wizard = readFileSync("apps/mobile/src/features/plans/PlanGenerationWizardScreen.tsx", "utf8");
  assert.match(api, /API_TIMEOUTS = \{/);
  assert.match(api, /health: 8000/);
  assert.match(api, /read: 8000/);
  assert.match(api, /mutation: 12000/);
  assert.match(api, /planGeneration: 30000/);
  assert.match(api, /config\.timeoutMs \?\? defaultTimeout/);
  assert.match(api, /generateDailyPlan\(minutes = 15, idempotencyKey = createGenerationRequestId\("daily"\), context: PlanGenerationRequest = \{\}\)/);
  assert.match(api, /idempotency_key: idempotencyKey/);
  assert.match(api, /timeoutMs: API_TIMEOUTS\.planGeneration/);
  assert.match(api, /timeoutMs: 40000/);
  assert.match(api, /timeoutMs: 60000/);
  assert.match(wizard, /createGenerationRequestId\(scope\)/);
  assert.match(wizard, /Generate today/);
  assert.match(wizard, /disabled=\{generate\.isPending\}/);
  assert.match(wizard, /queryClient\.setQueryData\(\["plan", plan\.id\]/);
  assert.match(wizard, /queryClient\.refetchQueries\(\{ queryKey: \["today-plan"\], type: "active" \}\)/);
  assert.match(wizard, /router\.replace\(previewHref\(previewPlanId/);
});

test("auth screens use safe-area keyboard shell and compact controls", () => {
  const authScreen = readFileSync("apps/mobile/src/features/auth/AuthScreen.tsx", "utf8");
  assert.match(authScreen, /function AuthShell/);
  assert.match(authScreen, /useSafeAreaInsets/);
  assert.match(authScreen, /KeyboardAvoidingView/);
  assert.match(authScreen, /keyboardShouldPersistTaps="handled"/);
  assert.match(authScreen, /contentInsetAdjustmentBehavior="automatic"/);
  assert.match(authScreen, /paddingTop: Math\.max\(24, insets\.top \+ 16\)/);
  assert.match(authScreen, /function CompactToggle/);
  assert.match(authScreen, /Feather name=\{selected \? icon : "square"\}/);
  assert.match(authScreen, /label=\{showPassword \? "Hide password" : "Show password"\}/);
  assert.match(authScreen, /label="Remember this session"/);
  assert.doesNotMatch(authScreen, /ChoiceChip label=\{showPassword/);
  assert.doesNotMatch(authScreen, /ChoiceChip label="Remember this session"/);
});

test("login connectivity errors use retry state and session reset is development-only", () => {
  const authScreen = readFileSync("apps/mobile/src/features/auth/AuthScreen.tsx", "utf8");
  assert.match(authScreen, /Unable to connect/);
  assert.match(authScreen, /We couldn't reach MoveInRange\. Check your connection and try again\./);
  assert.match(authScreen, /<ActionButton label="Retry" onPress=\{onRetry\} \/>/);
  assert.match(authScreen, /process\.env\.NODE_ENV !== "production"/);
  assert.match(authScreen, /process\.env\.EXPO_PUBLIC_ENABLE_SESSION_RESET === "true"/);
  assert.doesNotMatch(authScreen, /<ActionButton label="Clear saved session"/);
  assert.doesNotMatch(authScreen, /<SecondaryLink href=\{LOGIN_ROUTE\} label="Clear saved session"/);
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

test("plan screens render date-specific week and month sessions with stable IDs and media previews", () => {
  const source = readFileSync("apps/mobile/src/features/plans/PlanScreens.tsx", "utf8");
  assert.match(source, /selectedDate/);
  assert.match(source, /selectedDay/);
  assert.match(source, /day\.session_id/);
  assert.match(source, /day\.items\?\.\[0\]/);
  assert.match(source, /ExerciseMediaFrame/);
  assert.doesNotMatch(source, /key=\{`\$\{week\.week\}-\$\{day\.day\}`\}/);
});

test("workout screen preserves phase time across pause and prevents duplicate completion submissions", () => {
  const source = readFileSync("apps/mobile/src/features/workout/WorkoutScreens.tsx", "utf8");
  assert.match(source, /completionSubmittedRef/);
  assert.match(source, /pausedRemainingSeconds/);
  assert.match(source, /phaseBeforePause/);
  assert.match(source, /Date\.now\(\) - Math\.max\(0, duration - remaining\) \* 1000/);
  assert.match(source, /requestCompletion/);
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
  assert.match(sessionGuard, /Restoring secure session/);
  assert.doesNotMatch(rootLayout, /<SessionGuard>\s*<Stack/s);
});

test("product workflow is decomposed into feature-specific screens", () => {
  const workflow = readFileSync("apps/mobile/src/screens/ProductWorkflowScreen.tsx", "utf8");
  assert.ok(workflow.split("\n").length <= 120, "ProductWorkflowScreen must remain a small dispatcher");
  assert.doesNotMatch(workflow, /function renderBody/);
  assert.doesNotMatch(workflow, /AuthScreen/);
  assert.doesNotMatch(workflow, /case "auth"/);
  const featureFiles = [
    "apps/mobile/src/features/auth/AuthScreen.tsx",
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

test("product workflow imports resolve with exact source-file casing", () => {
  const workflowPath = "apps/mobile/src/screens/ProductWorkflowScreen.tsx";
  const workflow = readFileSync(workflowPath, "utf8");
  const missing = [];
  for (const match of workflow.matchAll(/from "(\.\.[^"]+)"/g)) {
    const withoutExtension = join(dirname(workflowPath), match[1]).replace(/\\/g, "/");
    const candidates = [`${withoutExtension}.tsx`, `${withoutExtension}.ts`, `${withoutExtension}/index.tsx`, `${withoutExtension}/index.ts`];
    if (!candidates.some((candidate) => existsSync(candidate))) missing.push(match[1]);
  }
  assert.deepEqual(missing, []);
});

test("mobile product shell exposes Home Program Move Progress Profile tabs", () => {
  const tabs = readFileSync("apps/mobile/app/(tabs)/_layout.tsx", "utf8");
  for (const tab of ["tabs.home", "tabs.program", "tabs.move", "tabs.progress", "tabs.profile"]) assert.match(tabs, new RegExp(tab));
  assert.match(tabs, /name="program"/);
  assert.match(tabs, /name="progress"/);
  assert.match(tabs, /name="plan" options=\{\{ href: null \}\}/);
  assert.match(tabs, /name="insights" options=\{\{ href: null \}\}/);
  for (const hidden of ["daily-plan", "weekly-plan", "monthly-plan", "exercises", "exercise/\\[id\\]", "readiness", "generate-plan", "workout-preview", "general-info", "onboarding-edit", "settings", "privacy"]) {
    assert.match(tabs, new RegExp(`name="${hidden}" options=\\{\\{ href: null \\}\\}`));
  }
});

test("exercise media reaches cards detail and guided player surfaces", () => {
  const mediaFrame = readFileSync("apps/mobile/src/features/shared/ExerciseMediaFrame.tsx", "utf8");
  const planScreens = readFileSync("apps/mobile/src/features/plans/PlanScreens.tsx", "utf8");
  const exerciseScreens = readFileSync("apps/mobile/src/features/exercises/ExerciseScreens.tsx", "utf8");
  const workoutScreens = readFileSync("apps/mobile/src/features/workout/WorkoutScreens.tsx", "utf8");
  assert.match(mediaFrame, /thumbnail_url/);
  assert.match(mediaFrame, /gif_url/);
  assert.match(mediaFrame, /Retry|Guide/);
  assert.doesNotMatch(mediaFrame, /GIF in detail/);
  assert.match(planScreens, /<ExerciseMediaFrame/);
  assert.match(exerciseScreens, /<ExerciseMediaFrame/);
  assert.doesNotMatch(exerciseScreens, /GIF available/);
  assert.match(workoutScreens, /<ExerciseMediaFrame/);
  assert.match(workoutScreens, /Next:/);
});

test("exercise library implements search filters favorites recents and cache surfaces", () => {
  const exerciseScreens = readFileSync("apps/mobile/src/features/exercises/ExerciseScreens.tsx", "utf8");
  const cache = readFileSync("apps/mobile/src/features/exercises/exerciseCache.ts", "utf8");
  const moveTab = readFileSync("apps/mobile/app/(tabs)/move.tsx", "utf8");
  assert.match(exerciseScreens, /FlatList/);
  assert.match(exerciseScreens, /numColumns=\{twoColumn \? 2 : 1\}/);
  assert.match(exerciseScreens, /FilterSheet/);
  assert.match(exerciseScreens, /debounce|setTimeout/);
  assert.match(exerciseScreens, /favoriteExercise/);
  assert.match(exerciseScreens, /unfavoriteExercise/);
  assert.match(exerciseScreens, /Recently viewed/);
  assert.match(exerciseScreens, /cached/);
  assert.match(cache, /MAX_RECENTS = 30/);
  assert.match(cache, /PAGE_PREFIX/);
  assert.match(moveTab, /ExerciseLibraryScreen/);
});

test("guided workout screen is state driven and not a debug control stack", () => {
  const workoutScreens = readFileSync("apps/mobile/src/features/workout/WorkoutScreens.tsx", "utf8");
  for (const phase of ["PREPARING", "WORKING", "RESTING", "PAUSED", "SUBSTITUTING", "PAIN_CHECK", "COMPLETING", "COMPLETED"]) {
    assert.match(workoutScreens, new RegExp(`"${phase}"`));
  }
  assert.doesNotMatch(workoutScreens, /Speech\.speak/);
  assert.match(workoutScreens, /speakCue/);
  assert.match(workoutScreens, /Alert\.alert/);
  assert.match(workoutScreens, /Haptics\.impactAsync/);
  assert.match(workoutScreens, /formatClock/);
  assert.match(workoutScreens, /Save feedback/);
  assert.match(workoutScreens, /recordWorkoutFeedback/);
  assert.match(workoutScreens, /feedbackSaved/);
  assert.doesNotMatch(workoutScreens, /Next actions/);
  assert.doesNotMatch(workoutScreens, /Save quick feedback/);
  assert.doesNotMatch(workoutScreens, /Preparation, work, rest, pause, skip, substitute, and completion controls are available/);
});

test("home removes duplicate global shortcut buttons and keeps tab navigation", () => {
  const home = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
  const tabs = readFileSync("apps/mobile/app/(tabs)/_layout.tsx", "utf8");
  assert.doesNotMatch(home, /\["Program", "\/(\(tabs\)\/)?program"\]/);
  assert.doesNotMatch(home, /\["Move", "\/(\(tabs\)\/)?move"\]/);
  assert.doesNotMatch(home, /\["Progress", "\/(\(tabs\)\/)?progress"\]/);
  assert.doesNotMatch(home, /\["Privacy", "\/privacy"\]/);
  assert.doesNotMatch(home, /accessibilityRole="link"[\s\S]{0,240}Program/);
  assert.doesNotMatch(home, /accessibilityRole="link"[\s\S]{0,240}Privacy/);
  for (const tab of ["tabs.home", "tabs.program", "tabs.move", "tabs.progress", "tabs.profile"]) assert.match(tabs, new RegExp(tab));
});

test("readiness is visual and gates every new workout start", () => {
  const home = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
  const daily = readFileSync("apps/mobile/src/features/plans/PlanScreens.tsx", "utf8");
  const workout = readFileSync("apps/mobile/src/features/workout/WorkoutScreens.tsx", "utf8");
  const preview = readFileSync("apps/mobile/src/features/workout/WorkoutPreviewScreen.tsx", "utf8");
  const readiness = readFileSync("apps/mobile/src/features/readiness/ReadinessScreen.tsx", "utf8");
  const startContext = readFileSync("apps/mobile/src/features/readiness/startContext.ts", "utf8");
  assert.match(home, /\/workout-preview\?planId=/);
  assert.doesNotMatch(home, /submitReadiness/);
  assert.doesNotMatch(home, /readinessReady/);
  assert.doesNotMatch(home, /startSession/);
  assert.match(daily, /\/workout-preview\?planId=/);
  assert.match(daily, /selectedDay\.daily_plan_id/);
  assert.match(daily, /returnTo=\/weekly-plan/);
  assert.match(daily, /returnTo=\/monthly-plan/);
  assert.match(preview, /readinessStartHref\(\{ source: "preview"/);
  assert.match(preview, /Workout Preview/);
  assert.match(preview, /Modify today's workout/);
  assert.match(workout, /readinessStartHref\(\{ source: "preview"/);
  assert.match(workout, /selectedSessionPlan\(planPayload, params\.sessionDate, params\.selectedDay\)/);
  assert.match(workout, /startSession\(id && id !== "today" \? params\.planId : daily\.data\?\.plan\?\.id, true\)/);
  assert.match(workout, /assertCanonicalPlanItems/);
  assert.match(workout, /autoResumeStartedRef/);
  assert.match(workout, /isExistingSessionRoute \? start\.isPending \? "Resuming\.\.\." : "Resume guided workout" : "Check readiness & start"/);
  assert.doesNotMatch(daily, /hasValidSameDayReadiness/);
  assert.doesNotMatch(daily, /readinessReady/);
  assert.match(readiness, /enabled: !isStartIntent/);
  assert.match(readiness, /const result = readinessMutation\.data \?\? \(isStartIntent \? undefined : readiness\.data\?\.item\)/);
  assert.match(readiness, /Acknowledge adjustments and start/);
  assert.match(readiness, /Continue to workout/);
  assert.match(readiness, /readinessDelaysStart/);
  assert.doesNotMatch(readiness, /canAutoStart/);
  assert.match(startContext, /intent: "start"/);
  assert.match(startContext, /source/);
  assert.match(startContext, /sessionDate/);
  assert.match(startContext, /selectedDay/);
  assert.match(startContext, /returnTo/);
  for (const text of ["How is your energy?", "How did you sleep?", "Any pain today?", "Any injury or symptom change?", "Stress level?", "How much time do you have?"]) {
    assert.match(readiness, new RegExp(text.replace(/[?]/g, "\\?")));
  }
});

test("readiness body-area follow-ups are scoped to pain and injury steps", () => {
  const readiness = readFileSync("apps/mobile/src/features/readiness/ReadinessScreen.tsx", "utf8");
  assert.match(readiness, /type ReadinessAnswers = \{/);
  assert.match(readiness, /pain: \{ level: string; bodyAreas: string\[\]; movementWorse: boolean \}/);
  assert.match(readiness, /injury: \{ status: string; bodyAreas: string\[\] \}/);
  assert.match(readiness, /followUp: "pain-body-areas"/);
  assert.match(readiness, /followUp: "injury-body-areas"/);
  assert.match(readiness, /const showPainBodyAreas = currentStep\.followUp === "pain-body-areas" && answers\.pain\.level !== "none"/);
  assert.match(readiness, /const showInjuryBodyAreas = currentStep\.followUp === "injury-body-areas" && \["recent", "worse"\]\.includes\(answers\.injury\.status\)/);
  assert.match(readiness, /value === "none" \? \[\] : current\.pain\.bodyAreas/);
  assert.match(readiness, /\["recent", "worse"\]\.includes\(value\) \? current\.injury\.bodyAreas : \[\]/);
  assert.match(readiness, /pain_locations: answers\.pain\.bodyAreas/);
  assert.match(readiness, /injury_locations: answers\.injury\.bodyAreas/);
  assert.doesNotMatch(readiness, /step >= 2/);
  assert.doesNotMatch(readiness, /answers\.pain !== "none" \|\| answers\.new_injury/);
  assert.doesNotMatch(readiness, /const \[painAreas, setPainAreas\]/);
});

test("localized speech cues use app language and translated countdown words", () => {
  const speechService = readFileSync("apps/mobile/src/guidance/speechCues.ts", "utf8");
  const localization = readFileSync("apps/mobile/src/i18n/localization.ts", "utf8");
  assert.match(speechService, /"countdown\.three": "Three"/);
  assert.match(speechService, /"countdown\.three": "Üç"/);
  assert.match(speechService, /"workout\.resumed": "Resumed"/);
  assert.match(speechService, /"workout\.resumed": "Devam ediyor"/);
  assert.match(localization, /language === "tr" \? "tr-TR" : "en-US"/);
  assert.match(speechService, /if \(seconds === 3\) return "countdown\.three"/);
  assert.match(speechService, /if \(seconds === 2\) return "countdown\.two"/);
  assert.match(speechService, /if \(seconds === 1\) return "countdown\.one"/);
  assert.match(speechService, /language: resolved\.language/);
  assert.doesNotMatch(speechService, /Speech\.speak\(["'`]\\d/);
});

test("profile and settings expose logout and persisted language controls", () => {
  const profile = readFileSync("apps/mobile/app/(tabs)/profile.tsx", "utf8");
  const settings = readFileSync("apps/mobile/src/features/settings/SettingsScreen.tsx", "utf8");
  const api = readFileSync("apps/mobile/src/api.ts", "utf8");
  const provider = readFileSync("apps/mobile/src/i18n/LanguageProvider.tsx", "utf8");
  assert.match(profile, /Log out/);
  assert.match(profile, /clearExerciseCache/);
  assert.match(profile, /"Movement profile"/);
  assert.match(profile, /"\/onboarding-edit"/);
  assert.doesNotMatch(profile, /\["\/auth", "Auth"\]/);
  assert.doesNotMatch(profile, /Complete guided onboarding sample/);
  assert.doesNotMatch(profile, /Save onboarding profile/);
  assert.doesNotMatch(settings, /Save safe default settings/);
  assert.doesNotMatch(settings, /twenty minute back and core plan/);
  assert.doesNotMatch(api, /preferred_name: "Aylin"/);
  assert.doesNotMatch(api, /date_of_birth: "1982-04-20"/);
  assert.match(settings, /settings\.english/);
  assert.match(settings, /setLanguage\("en"\)/);
  assert.match(settings, /setLanguage\("tr"\)/);
  assert.match(provider, /AsyncStorage\.setItem\(LANGUAGE_KEY/);
  assert.match(provider, /expo-localization/);
});

test("normal detail routes live in the tab shell and Next actions are removed", () => {
  for (const route of [
    "apps/mobile/app/(tabs)/daily-plan.tsx",
    "apps/mobile/app/(tabs)/weekly-plan.tsx",
    "apps/mobile/app/(tabs)/monthly-plan.tsx",
    "apps/mobile/app/(tabs)/exercises.tsx",
    "apps/mobile/app/(tabs)/exercise/[id].tsx",
    "apps/mobile/app/(tabs)/readiness.tsx",
    "apps/mobile/app/(tabs)/settings.tsx",
    "apps/mobile/app/(tabs)/privacy.tsx"
  ]) assert.equal(existsSync(route), true, route);
  for (const removed of [
    "apps/mobile/app/daily-plan.tsx",
    "apps/mobile/app/weekly-plan.tsx",
    "apps/mobile/app/monthly-plan.tsx",
    "apps/mobile/app/exercises.tsx",
    "apps/mobile/app/readiness.tsx",
    "apps/mobile/app/settings.tsx",
    "apps/mobile/app/privacy.tsx"
  ]) assert.equal(existsSync(removed), false, removed);
  const shell = readFileSync("apps/mobile/src/features/shared/ui.tsx", "utf8");
  const workflow = readFileSync("apps/mobile/src/screens/ProductWorkflowScreen.tsx", "utf8");
  assert.doesNotMatch(shell, /Next actions/);
  assert.match(workflow, /if \(kind === "workout"\) return <WorkflowBody/);
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
  const params = new URLSearchParams(paramsFor({ q: "knee", body_part: "upper legs", equipment: "chair", target: "quads", bodyweight: true, favorites: true }, 2));
  assert.equal(params.get("q"), "knee");
  assert.equal(params.get("body_part"), "upper legs");
  assert.equal(params.get("equipment"), "chair");
  assert.equal(params.get("target"), "quads");
  assert.equal(params.get("bodyweight"), "true");
  assert.equal(params.get("favorites"), "true");
  assert.equal(params.get("page"), "2");
  assert.equal(params.get("page_size"), "24");
  assert.equal(params.get("language"), "en");
});

test("session gate protects auth, onboarding, and app routes centrally", () => {
  assert.deepEqual(resolveSessionGate("/daily-plan", { hasSession: false, onboardingComplete: false }), { state: "SIGNED_OUT", redirectTo: LOGIN_ROUTE });
  assert.deepEqual(resolveSessionGate("/daily-plan", { hasSession: true, onboardingComplete: false }), { state: "AUTHENTICATED_ONBOARDING_INCOMPLETE", redirectTo: "/onboarding" });
  assert.deepEqual(resolveSessionGate("/onboarding", { hasSession: true, onboardingComplete: true }), { state: "AUTHENTICATED_READY", redirectTo: "/(tabs)" });
  assert.deepEqual(resolveSessionGate("/onboarding-edit", { hasSession: true, onboardingComplete: true }), { state: "AUTHENTICATED_READY", redirectTo: undefined });
  assert.deepEqual(resolveSessionGate("/onboarding-edit", { hasSession: false, onboardingComplete: true }), { state: "SIGNED_OUT", redirectTo: LOGIN_ROUTE });
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

test("short onboarding metadata covers essential planning inputs only", () => {
  assert.equal(ONBOARDING_STEPS.length, 7);
  assert.deepEqual(ONBOARDING_STEPS.map((step) => step.key), ["welcome", "goal", "activity", "limitations", "equipment", "pattern", "review_complete"]);
  assert.equal(ONBOARDING_STEPS.some((step) => /energy|sleep|stress|pain today|available time/i.test(`${step.title.en} ${step.subtitle.en}`)), false);
  assert.equal(BODY_AREAS.includes("Shoulder"), true);
  const draft = {
    language: "en",
    primaryGoal: "mobility",
    activityLevel: "starting",
    limitations: ["joint"],
    limitationBodyAreas: ["Shoulder"],
    equipment: ["body weight", "chair"],
    preferredDays: "3",
    preferredMinutes: "15",
    currentStep: 6,
    submitted: false
  };
  assert.equal(onboardingNeedsBodyAreas(draft), true);
  assert.deepEqual(validateOnboardingStepPayload("goal", { ...draft, primaryGoal: "" }), ["goal_required"]);
  assert.deepEqual(validateOnboardingStepPayload("pattern", { ...draft, preferredMinutes: "" }), ["pattern_required"]);
  assert.deepEqual(onboardingPayload(draft).preferred_training_days, ["Mon", "Wed", "Fri"]);
  assert.deepEqual(onboardingPayload(draft).limitation_body_areas, ["Shoulder"]);
});

test("onboarding screen is page-by-page card flow with local draft persistence", () => {
  const source = readFileSync("apps/mobile/src/features/onboarding/OnboardingScreen.tsx", "utf8");
  const workflow = readFileSync("apps/mobile/src/screens/ProductWorkflowScreen.tsx", "utf8");
  assert.match(source, /ONBOARDING_LOCAL_DRAFT_KEY/);
  assert.match(source, /AsyncStorage\.getItem\(ONBOARDING_LOCAL_DRAFT_KEY\)/);
  assert.match(source, /AsyncStorage\.setItem\(ONBOARDING_LOCAL_DRAFT_KEY/);
  assert.match(source, /AsyncStorage\.removeItem\(ONBOARDING_LOCAL_DRAFT_KEY\)/);
  assert.match(source, /OptionCard/);
  assert.match(source, /accessibilityState=\{\{ selected \}\}/);
  assert.match(source, /currentStep/);
  assert.match(source, /Create my plan/);
  assert.match(source, /saveOnboardingStep\("review_complete"/);
  assert.match(source, /generateDailyPlan/);
  assert.doesNotMatch(source, /TextField/);
  assert.doesNotMatch(workflow, /Twenty-two focused steps/);
  const api = readFileSync("apps/mobile/src/api.ts", "utf8");
  assert.match(api, /AsyncStorage\.removeItem\(ONBOARDING_LOCAL_DRAFT_KEY\)/);
});

test("completed users can edit onboarding without first-run redirect or sample data", () => {
  const route = readFileSync("apps/mobile/app/(tabs)/onboarding-edit.tsx", "utf8");
  const tabs = readFileSync("apps/mobile/app/(tabs)/_layout.tsx", "utf8");
  const workflow = readFileSync("apps/mobile/src/screens/ProductWorkflowScreen.tsx", "utf8");
  const source = readFileSync("apps/mobile/src/features/onboarding/OnboardingScreen.tsx", "utf8");
  const profileEditors = readFileSync("apps/mobile/src/features/profile/ProfileEditorScreens.tsx", "utf8");
  assert.match(route, /kind="onboarding-edit"/);
  assert.match(tabs, /name="onboarding-edit" options=\{\{ href: null \}\}/);
  assert.match(workflow, /"onboarding-edit": \{ title: "Movement profile"/);
  assert.match(workflow, /case "onboarding-edit": return <MovementProfileScreen \/>/);
  assert.match(profileEditors, /title="Movement Profile"/);
  assert.match(profileEditors, /Edit movement profile/);
  assert.match(profileEditors, /<OnboardingScreen mode="edit" returnTo="\/onboarding-edit" \/>/);
  assert.match(source, /mode = "first-run"/);
  assert.match(source, /const isEdit = mode === "edit"/);
  assert.match(source, /ONBOARDING_STEPS\.filter\(\(step\) => step\.key !== "welcome"\)/);
  assert.match(source, /onboardingDraftFromProfile/);
  assert.match(source, /router\.replace\(isEdit \? returnTo as never : "\/(\(tabs\))?" as never/);
  assert.match(source, /Save changes/);
  assert.match(source, /Cancel/);
  assert.doesNotMatch(source, /preferred_name: "Aylin"/);
});

test("onboarding edit prefill maps saved profile fields without erasing unrelated data", () => {
  const draft = onboardingDraftFromProfile({
    goals: ["strength"],
    activity_level: "regular",
    movement_limitations: ["joint"],
    limitation_body_areas: ["Shoulder"],
    equipment: ["chair", "resistance band"],
    preferred_days_per_week: "4",
    preferred_minutes: 30,
    unrelated_medical_record: "preserve-on-server"
  }, "tr");
  assert.equal(draft.language, "tr");
  assert.equal(draft.primaryGoal, "strength");
  assert.equal(draft.activityLevel, "regular");
  assert.deepEqual(draft.limitations, ["joint"]);
  assert.deepEqual(draft.limitationBodyAreas, ["Shoulder"]);
  assert.deepEqual(draft.equipment, ["chair", "resistance band"]);
  assert.equal(draft.preferredDays, "4");
  assert.equal(draft.preferredMinutes, "30");
  const payload = onboardingPayload(draft);
  assert.equal("unrelated_medical_record" in payload, false);
  assert.equal(payload.onboarding_complete, true);
});

test("sprint flow uses wizard preview canonical player feedback profile integrations and shared safe areas", () => {
  const home = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
  const program = readFileSync("apps/mobile/app/(tabs)/program.tsx", "utf8");
  const daily = readFileSync("apps/mobile/src/features/plans/PlanScreens.tsx", "utf8");
  const wizard = readFileSync("apps/mobile/src/features/plans/PlanGenerationWizardScreen.tsx", "utf8");
  const preview = readFileSync("apps/mobile/src/features/workout/WorkoutPreviewScreen.tsx", "utf8");
  const workout = readFileSync("apps/mobile/src/features/workout/WorkoutScreens.tsx", "utf8");
  const profile = readFileSync("apps/mobile/app/(tabs)/profile.tsx", "utf8");
  const editors = readFileSync("apps/mobile/src/features/profile/ProfileEditorScreens.tsx", "utf8");
  const integrations = readFileSync("apps/mobile/src/features/integrations/IntegrationsScreen.tsx", "utf8");
  const shared = readFileSync("apps/mobile/src/features/shared/ui.tsx", "utf8");
  const routes = mobileRoutes();
  for (const route of ["/generate-plan", "/workout-preview", "/general-info", "/onboarding-edit"]) assert.equal(routes.has(route), true, route);
  assert.match(home, /router\.push\("\/generate-plan\?scope=daily/);
  assert.doesNotMatch(home, /generateDailyPlan/);
  assert.match(program, /scope=weekly/);
  assert.match(program, /scope=monthly/);
  assert.match(daily, /scope=daily/);
  for (const text of ["How are you feeling today?", "What would you like to work on?", "How much time do you have?", "What style fits today?"]) assert.match(wizard, new RegExp(text.replace(/[?]/g, "\\?")));
  assert.match(wizard, /previewPlanId/);
  assert.match(preview, /planItemIds/);
  assert.match(preview, /assertCanonicalPlanItems/);
  assert.match(preview, /readinessStartHref/);
  assert.match(workout, /params\.planId/);
  assert.match(workout, /payload\?\.plan_item_ids/);
  assert.match(workout, /recordWorkoutFeedback/);
  assert.match(workout, /effortOptions/);
  assert.match(workout, /futurePreferenceOptions/);
  assert.match(profile, /General Information/);
  assert.match(profile, /Movement profile/);
  assert.match(editors, /title="General Information"/);
  assert.match(editors, /title="Movement Profile"/);
  assert.match(editors, /\/profile\/general/);
  assert.match(integrations, /Configure Nightscout/);
  assert.match(integrations, /Test connection/);
  assert.match(integrations, /View requirements/);
  assert.match(shared, /function TabScreenScroll/);
  assert.match(shared, /usePathname/);
  for (const file of ["index", "program", "move", "progress", "profile"]) {
    const source = readFileSync(`apps/mobile/app/(tabs)/${file}.tsx`, "utf8");
    assert.match(source, /TabScreenScroll/);
  }
});
