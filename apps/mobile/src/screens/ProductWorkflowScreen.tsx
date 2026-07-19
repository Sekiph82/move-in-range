import { type ReactNode, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  analyzeCameraMock,
  apiFetch,
  completeSession,
  connectProvider,
  createQuickSession,
  generateAdvancedPlan,
  generateDailyPlan,
  generateMonthlyPlan,
  generateWeeklyPlan,
  inviteCaregiver,
  inviteProfessional,
  logDiabetesContext,
  logGlucose,
  modifyPlan,
  recordConsent,
  reportPain,
  saveCapacityProfile,
  saveGoalsTargets,
  saveNotificationPreference,
  saveOnboardingStep,
  saveProfile,
  startSession,
  submitReadiness
} from "../api";
import { useTheme } from "../theme";

type WorkflowKind =
  | "auth"
  | "onboarding"
  | "readiness"
  | "quick-session"
  | "daily-plan"
  | "weekly-plan"
  | "monthly-plan"
  | "calendar"
  | "exercises"
  | "exercise-detail"
  | "workout"
  | "workout-pain"
  | "workout-symptom"
  | "workout-feedback"
  | "diabetes"
  | "integrations"
  | "notifications"
  | "privacy"
  | "caregivers"
  | "professionals"
  | "achievements"
  | "settings";

type Props = {
  kind: WorkflowKind;
  id?: string;
};

const onboardingSteps = [
  "Welcome",
  "Wellness boundary",
  "Language and region",
  "Name",
  "Date of birth",
  "Gender",
  "Physiological context",
  "Height and weight",
  "Conditions",
  "Diabetes context",
  "Pain and sensitivity map",
  "Recent symptoms",
  "Clinician restrictions",
  "Movement confidence",
  "Balance and floor capacity",
  "Walking tolerance",
  "Equipment",
  "Training days",
  "Goals",
  "Target focus",
  "Notification consent",
  "Health data consent"
];

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary, opacity: disabled ? 0.5 : 1, paddingHorizontal: 14 }}
    >
      <Text style={{ color: theme.surface, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  const theme = useTheme();
  return (
    <Link href={href as never} asChild>
      <Pressable accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ color: theme.primary, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>{title}</Text>
      {children}
    </View>
  );
}

function BodyText({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const theme = useTheme();
  return <Text style={{ color: muted ? theme.muted : theme.text, lineHeight: 21 }}>{children}</Text>;
}

function ErrorText({ error }: { error: unknown }) {
  const theme = useTheme();
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return <Text style={{ color: theme.safety }}>{message}</Text>;
}

function RouteHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Pressable accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
        <Text style={{ color: theme.primary, fontWeight: "700" }}>Back</Text>
      </Pressable>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>{subtitle}</Text>
    </View>
  );
}

function useLatestPlan() {
  return useQuery({ queryKey: ["advanced"], queryFn: () => apiFetch<any>("/plans/advanced/latest") });
}

export function ProductWorkflowScreen({ kind, id }: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("care@moveinrange.local");
  const [stepIndex, setStepIndex] = useState(0);
  const [minutes, setMinutes] = useState("12");
  const [lastSessionId, setLastSessionId] = useState(id);

  const route = useMemo(() => {
    const map: Record<WorkflowKind, { title: string; subtitle: string }> = {
      auth: { title: "Sign in", subtitle: "A local demo session is created only after you continue." },
      onboarding: { title: "Onboarding", subtitle: "Twenty-two focused steps capture context before planning." },
      readiness: { title: "Readiness", subtitle: "A daily safety check gates movement intensity." },
      "quick-session": { title: "Quick session", subtitle: "Create a short plan from available time and constraints." },
      "daily-plan": { title: "Daily plan", subtitle: "Generate and adjust today's safe movement plan." },
      "weekly-plan": { title: "Weekly plan", subtitle: "Review a seven-day rhythm with rest and lower-intensity days." },
      "monthly-plan": { title: "Monthly plan", subtitle: "See progression phases and stopping rules." },
      calendar: { title: "Calendar", subtitle: "Movement events, sessions, and reminders in one timeline." },
      exercises: { title: "Exercises", subtitle: "Search, filter, and open safety-aware exercise detail." },
      "exercise-detail": { title: "Exercise detail", subtitle: "Instructions, tags, media fallback, and substitutions." },
      workout: { title: "Workout player", subtitle: "Guided movement, local voice cues, pause, and finish." },
      "workout-pain": { title: "Pain report", subtitle: "Pause the session and record a safer next action." },
      "workout-symptom": { title: "Symptom report", subtitle: "Stop movement and require a new readiness check." },
      "workout-feedback": { title: "Feedback", subtitle: "Capture exertion and exercise-specific feedback." },
      diabetes: { title: "Diabetes", subtitle: "Log context and delayed checks without treatment advice." },
      integrations: { title: "Integrations", subtitle: "Mock-ready providers connect; credentialed providers show blockers." },
      notifications: { title: "Notifications", subtitle: "Private local reminders with quiet-hour preferences." },
      privacy: { title: "Privacy", subtitle: "Export and deletion requests are explicit and auditable." },
      caregivers: { title: "Caregivers", subtitle: "Share limited progress context with a trusted helper." },
      professionals: { title: "Professionals", subtitle: "Invite a professional and keep restrictions scoped." },
      achievements: { title: "Achievements", subtitle: "Celebrate consistency without unsafe pressure." },
      settings: { title: "Settings", subtitle: "Maintain goals, capacity, consents, and accessibility preferences." }
    };
    return map[kind];
  }, [kind]);

  const readiness = useQuery({ queryKey: ["readiness"], enabled: ["readiness", "daily-plan", "workout"].includes(kind), queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const exercises = useQuery({ queryKey: ["workflow-exercises"], enabled: ["exercises", "exercise-detail"].includes(kind), queryFn: () => apiFetch<any>("/exercises?page_size=12&language=en") });
  const exerciseId = id ?? exercises.data?.items?.[0]?.id;
  const exercise = useQuery({ queryKey: ["workflow-exercise", exerciseId], enabled: kind === "exercise-detail" && Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}?language=en`) });
  const substitutions = useQuery({ queryKey: ["substitutions", exerciseId], enabled: kind === "exercise-detail" && Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}/substitutions`) });
  const media = useQuery({ queryKey: ["media", exerciseId], enabled: kind === "exercise-detail" && Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}/media-resolution?language=en&reduced_motion=false&low_bandwidth=false`) });
  const daily = useQuery({ queryKey: ["today-plan"], enabled: ["daily-plan", "workout"].includes(kind), queryFn: () => apiFetch<any>("/plans/daily/today") });
  const weekly = useQuery({ queryKey: ["weekly"], enabled: kind === "weekly-plan", queryFn: () => apiFetch<any>("/plans/weekly/current") });
  const monthly = useQuery({ queryKey: ["monthly"], enabled: kind === "monthly-plan", queryFn: () => apiFetch<any>("/plans/monthly/current") });
  const advanced = useLatestPlan();
  const calendar = useQuery({ queryKey: ["calendar"], enabled: kind === "calendar", queryFn: () => apiFetch<any>("/calendar") });
  const achievements = useQuery({ queryKey: ["achievements"], enabled: kind === "achievements", queryFn: () => apiFetch<any>("/achievements") });
  const insights = useQuery({ queryKey: ["insights"], enabled: ["achievements", "workout-feedback"].includes(kind), queryFn: () => apiFetch<any>("/insights/summary") });
  const diabetes = useQuery({ queryKey: ["diabetes"], enabled: kind === "diabetes", queryFn: () => apiFetch<any>("/diabetes/insights") });
  const providers = useQuery({ queryKey: ["providers"], enabled: kind === "integrations", queryFn: () => apiFetch<any>("/integrations/providers") });
  const notificationPrefs = useQuery({ queryKey: ["notifications"], enabled: kind === "notifications", queryFn: () => apiFetch<any>("/notification-preferences") });
  const exportJobs = useQuery({ queryKey: ["privacy-exports"], enabled: kind === "privacy", queryFn: () => apiFetch<any>("/privacy/export-jobs") });
  const profile = useQuery({ queryKey: ["profile"], enabled: kind === "settings", queryFn: () => apiFetch<any>("/profile") });

  const saveStepMutation = useMutation({
    mutationFn: () => saveOnboardingStep(onboardingSteps[stepIndex].toLowerCase().replaceAll(" ", "_"), { step_number: stepIndex + 1, accepted: true, diabetes_enabled: true, target_focuses: ["core", "back"] }, stepIndex === onboardingSteps.length - 1),
    onSuccess: () => setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1))
  });
  const authMutation = useMutation({ mutationFn: () => saveProfile("en") });
  const readinessMutation = useMutation({ mutationFn: submitReadiness, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["readiness"] }) });
  const dailyMutation = useMutation({ mutationFn: () => generateDailyPlan(Number(minutes) || 12), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const weeklyMutation = useMutation({ mutationFn: generateWeeklyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly"] }) });
  const monthlyMutation = useMutation({ mutationFn: generateMonthlyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly"] }) });
  const advancedMutation = useMutation({ mutationFn: () => generateAdvancedPlan({ available_minutes: Number(minutes) || 20, target_focuses: ["back", "core"], equipment: ["body weight", "chair"], no_floor: true }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["advanced"] }) });
  const quickMutation = useMutation({ mutationFn: () => createQuickSession({ available_minutes: Number(minutes) || 8, pain: 2, energy: 3, chair_only: true, equipment: ["chair"], natural_request: `${minutes} minute chair session` }) });
  const modifyMutation = useMutation({ mutationFn: () => modifyPlan(advanced.data?.plan?.id ?? daily.data?.plan?.id, "make_easier", { reason: "pain_or_fatigue", pain: 3 }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["advanced"] }) });
  const workoutMutation = useMutation({
    mutationFn: async () => {
      const started = await startSession(daily.data?.plan?.id);
      setLastSessionId(started.session.id);
      return started;
    }
  });
  const painMutation = useMutation({ mutationFn: () => reportPain(lastSessionId ?? "local-session") });
  const symptomMutation = useMutation({ mutationFn: () => apiFetch(`/sessions/${lastSessionId ?? "local-session"}/symptoms`, { method: "POST", body: JSON.stringify({ symptoms: ["dizziness"], idempotency_key: `symptom-${Date.now()}` }) }) });
  const feedbackMutation = useMutation({ mutationFn: () => completeSession(lastSessionId ?? "local-session"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insights"] }) });
  const diabetesMutation = useMutation({ mutationFn: () => logDiabetesContext({ timing: "post", value: 116, unit: "mg/dL", delayed_check_minutes: 120, context: "after movement" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diabetes"] }) });
  const glucoseMutation = useMutation({ mutationFn: () => logGlucose(lastSessionId) });
  const providerMutation = useMutation({ mutationFn: (key: string) => connectProvider(key, true), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["providers"] }) });
  const notificationMutation = useMutation({ mutationFn: () => saveNotificationPreference("workout_reminder", true), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const privacyMutation = useMutation({ mutationFn: () => apiFetch("/privacy/deletion-jobs", { method: "POST", body: JSON.stringify({ payload: { deletion_type: "selected_health_data" } }) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["privacy-exports"] }) });
  const exportMutation = useMutation({ mutationFn: () => apiFetch("/privacy/export-jobs", { method: "POST" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["privacy-exports"] }) });
  const caregiverMutation = useMutation({ mutationFn: () => inviteCaregiver(email, ["weekly_summary", "achievement_status"]) });
  const professionalMutation = useMutation({ mutationFn: () => inviteProfessional(email, "physical_therapist", ["readiness_summary", "movement_restrictions"]) });
  const settingsMutation = useMutation({
    mutationFn: async () => {
      await saveGoalsTargets(["mobility", "strength"], ["core", "back"], "twenty minute back and core plan");
      await saveCapacityProfile({ floor_rise_capacity: "unable", walking_tolerance_minutes: 8, balance_level: "needs_support" });
      await recordConsent("health_data_processing", true, { source: "settings" });
      return saveProfile("en");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] })
  });
  const cameraMutation = useMutation({ mutationFn: () => analyzeCameraMock({ exercise_id: exerciseId ?? "exercise", privacy_mode: "session_only", camera_consent: true }) });

  function renderBody() {
    if (kind === "auth") {
      return (
        <Panel title="Demo session">
          <BodyText muted>The app signs into the local API demo account, then stores tokens in SecureStore when available.</BodyText>
          <ActionButton label={authMutation.isPending ? "Starting..." : "Start local session"} onPress={() => authMutation.mutate()} />
          <SecondaryLink href="/onboarding" label="Continue to onboarding" />
          <ErrorText error={authMutation.error} />
        </Panel>
      );
    }

    if (kind === "onboarding") {
      return (
        <>
          <Panel title={`Step ${stepIndex + 1} of ${onboardingSteps.length}`}>
            <BodyText>{onboardingSteps[stepIndex]}</BodyText>
            <BodyText muted>Each step stores a resumable draft with the authenticated user and keeps health consent separate from profile details.</BodyText>
            <ActionButton label={saveStepMutation.isPending ? "Saving..." : stepIndex === onboardingSteps.length - 1 ? "Finish onboarding" : "Save and continue"} onPress={() => saveStepMutation.mutate()} />
            <ErrorText error={saveStepMutation.error} />
          </Panel>
          <Panel title="Captured sections">
            {onboardingSteps.map((step, index) => <BodyText key={step}>{index < stepIndex ? "Saved" : index === stepIndex ? "Current" : "Pending"}: {step}</BodyText>)}
          </Panel>
        </>
      );
    }

    if (kind === "readiness") {
      const action = readiness.data?.item?.decision?.action ?? "Not checked";
      return (
        <Panel title="Daily safety result">
          {readiness.isLoading ? <ActivityIndicator /> : <BodyText>{action}</BodyText>}
          <BodyText muted>{readiness.data?.item?.decision?.explanation ?? "Run the check before planning or starting a workout."}</BodyText>
          <ActionButton label={readinessMutation.isPending ? "Checking..." : "Run readiness check"} onPress={() => readinessMutation.mutate()} />
          <SecondaryLink href="/daily-plan" label="Open daily plan" />
          <ErrorText error={readinessMutation.error} />
        </Panel>
      );
    }

    if (["quick-session", "daily-plan"].includes(kind)) {
      return (
        <>
          <Panel title="Session constraints">
            <TextInput accessibilityLabel="Available minutes" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} style={{ minHeight: 48, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, color: theme.text }} />
            <ActionButton label={kind === "quick-session" ? (quickMutation.isPending ? "Creating..." : "Create quick session") : (dailyMutation.isPending ? "Generating..." : "Generate daily plan")} onPress={() => kind === "quick-session" ? quickMutation.mutate() : dailyMutation.mutate()} />
            <ErrorText error={kind === "quick-session" ? quickMutation.error : dailyMutation.error} />
          </Panel>
          <Panel title="Plan preview">
            {(daily.data?.plan?.items ?? (quickMutation.data as any)?.plan?.items ?? []).map((item: any) => <BodyText key={`${item.block}-${item.exercise_id}`}>{item.block}: {item.name}</BodyText>)}
            {!daily.data?.plan && !(quickMutation.data as any)?.plan ? <BodyText muted>No generated plan yet.</BodyText> : null}
            <SecondaryLink href={`/workout/${daily.data?.plan?.id ?? "quick-local"}`} label="Open guided workout" />
          </Panel>
        </>
      );
    }

    if (kind === "weekly-plan" || kind === "monthly-plan") {
      const data = kind === "weekly-plan" ? weekly.data?.plan?.days : monthly.data?.plan?.weeks;
      return (
        <Panel title={kind === "weekly-plan" ? "Schedule" : "Progression"}>
          {(data ?? []).map((item: any) => <BodyText key={item.day ?? item.week}>{item.day ?? `Week ${item.week}`}: {item.status ?? item.phase}</BodyText>)}
          {!data ? <BodyText muted>No plan saved yet.</BodyText> : null}
          <ActionButton label={kind === "weekly-plan" ? (weeklyMutation.isPending ? "Generating..." : "Generate weekly plan") : (monthlyMutation.isPending ? "Generating..." : "Generate monthly plan")} onPress={() => kind === "weekly-plan" ? weeklyMutation.mutate() : monthlyMutation.mutate()} />
        </Panel>
      );
    }

    if (kind === "calendar") {
      return (
        <Panel title="Timeline">
          {(calendar.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.event_date}: {item.event_type} - {item.status}</BodyText>)}
          {calendar.isLoading ? <ActivityIndicator /> : null}
          {calendar.data?.items?.length === 0 ? <BodyText muted>No events yet. Generate a plan or quick session first.</BodyText> : null}
        </Panel>
      );
    }

    if (kind === "exercises") {
      return (
        <Panel title="Library">
          {(exercises.data?.items ?? []).map((item: any) => <SecondaryLink key={item.id} href={`/exercise/${item.id}`} label={`${item.name} - ${item.body_part}`} />)}
          {exercises.isLoading ? <ActivityIndicator /> : null}
        </Panel>
      );
    }

    if (kind === "exercise-detail") {
      return (
        <>
          <Panel title={exercise.data?.name ?? "Exercise"}>
            <BodyText muted>{exercise.data?.instruction ?? "Loading instructions and safety metadata."}</BodyText>
            {(exercise.data?.instruction_steps ?? []).map((step: string, index: number) => <BodyText key={step}>{index + 1}. {step}</BodyText>)}
            <BodyText>Media: {media.data?.media?.source_type ?? "internal fallback pending"}</BodyText>
            <BodyText muted>Attribution: {exercise.data?.media?.attribution ?? "No committed external media."}</BodyText>
            <ActionButton label={cameraMutation.isPending ? "Analyzing..." : "Mock privacy-first form check"} onPress={() => cameraMutation.mutate()} />
          </Panel>
          <Panel title="Approved substitutions">
            {(substitutions.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.name}</BodyText>)}
          </Panel>
        </>
      );
    }

    if (kind === "workout") {
      return (
        <>
          <Panel title="Guidance">
            <BodyText muted>Voice cues announce preparation, pain stop, and rest while only the current and next media items are prefetched.</BodyText>
            <ActionButton label={workoutMutation.isPending ? "Starting..." : "Start guided workout"} onPress={() => workoutMutation.mutate()} />
            <SecondaryLink href={`/workout/${lastSessionId ?? "local-session"}/pain`} label="Report pain" />
            <SecondaryLink href={`/workout/${lastSessionId ?? "local-session"}/symptom`} label="Report symptoms" />
            <SecondaryLink href={`/workout/${lastSessionId ?? "local-session"}/feedback`} label="Finish with feedback" />
            <ErrorText error={workoutMutation.error} />
          </Panel>
          <Panel title="Plan items">
            {(daily.data?.plan?.items ?? []).map((item: any) => <BodyText key={`${item.block}-${item.exercise_id}`}>{item.block}: {item.name}</BodyText>)}
            {!daily.data?.plan ? <BodyText muted>No daily plan loaded. Generate a daily plan first.</BodyText> : null}
          </Panel>
        </>
      );
    }

    if (kind === "workout-pain" || kind === "workout-symptom" || kind === "workout-feedback") {
      const mutation = kind === "workout-pain" ? painMutation : kind === "workout-symptom" ? symptomMutation : feedbackMutation;
      return (
        <Panel title="Session event">
          <BodyText muted>{kind === "workout-symptom" ? "Concerning symptoms stop the active timer and send the user back to readiness." : "The event is persisted with an idempotency key and shown in insights."}</BodyText>
          <ActionButton label={mutation.isPending ? "Saving..." : "Save event"} onPress={() => mutation.mutate()} />
          <ErrorText error={mutation.error} />
        </Panel>
      );
    }

    if (kind === "diabetes") {
      return (
        <Panel title="Context log">
          <BodyText muted>This module stores glucose context and delayed check reminders only. It does not change medication guidance.</BodyText>
          <ActionButton label={diabetesMutation.isPending ? "Saving..." : "Log post-session context"} onPress={() => diabetesMutation.mutate()} />
          <ActionButton label={glucoseMutation.isPending ? "Saving..." : "Log sample"} onPress={() => glucoseMutation.mutate()} />
          <BodyText>Insight status: {diabetes.data?.insights?.status ?? "No context yet"}</BodyText>
        </Panel>
      );
    }

    if (kind === "integrations") {
      return (
        <Panel title="Providers">
          {(providers.data?.items ?? []).map((provider: any) => (
            <View key={provider.key} style={{ gap: 4 }}>
              <BodyText>{provider.name ?? provider.key}: {provider.status}</BodyText>
              <BodyText muted>{provider.status === "mock_ready" ? "Mock sync is available for local validation." : "External developer credentials are required before activation."}</BodyText>
              <ActionButton label={`Connect ${provider.key}`} disabled={provider.status !== "mock_ready"} onPress={() => providerMutation.mutate(provider.key)} />
            </View>
          ))}
          <ErrorText error={providerMutation.error} />
        </Panel>
      );
    }

    if (kind === "notifications") {
      return (
        <Panel title="Preferences">
          {(notificationPrefs.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.category}: {item.enabled ? "enabled" : "off"} - {item.channel}</BodyText>)}
          <ActionButton label={notificationMutation.isPending ? "Saving..." : "Enable workout reminders"} onPress={() => notificationMutation.mutate()} />
        </Panel>
      );
    }

    if (kind === "privacy") {
      return (
        <Panel title="Data rights">
          <ActionButton label={exportMutation.isPending ? "Creating..." : "Request export"} onPress={() => exportMutation.mutate()} />
          <ActionButton label={privacyMutation.isPending ? "Requesting..." : "Request selected deletion"} onPress={() => privacyMutation.mutate()} />
          {(exportJobs.data?.items ?? []).map((item: any) => <BodyText key={item.id}>Export {item.id}: {item.status}</BodyText>)}
        </Panel>
      );
    }

    if (kind === "caregivers" || kind === "professionals") {
      const mutation = kind === "caregivers" ? caregiverMutation : professionalMutation;
      return (
        <Panel title="Invite">
          <TextInput accessibilityLabel="Invite email" value={email} onChangeText={setEmail} autoCapitalize="none" style={{ minHeight: 48, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, color: theme.text }} />
          <ActionButton label={mutation.isPending ? "Sending..." : "Send invite"} onPress={() => mutation.mutate()} />
          <BodyText muted>Scopes are limited and revocable; private health details stay masked unless explicitly shared.</BodyText>
          <ErrorText error={mutation.error} />
        </Panel>
      );
    }

    if (kind === "achievements") {
      return (
        <>
          <Panel title="Earned">
            {(achievements.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.achievement_key}: {item.status}</BodyText>)}
            {achievements.data?.items?.length === 0 ? <BodyText muted>No achievements yet.</BodyText> : null}
          </Panel>
          <Panel title="Progress">
            <BodyText>Sessions completed: {insights.data?.sessions_completed ?? 0}</BodyText>
            <BodyText>Weekly completion: {Math.round((insights.data?.weekly_completion_rate ?? 0) * 100)}%</BodyText>
          </Panel>
        </>
      );
    }

    return (
      <Panel title="Health settings">
        <BodyText>Name: {profile.data?.profile?.preferred_name ?? "Not saved"}</BodyText>
        <BodyText>Equipment: {(profile.data?.profile?.equipment ?? []).join(", ") || "Not saved"}</BodyText>
        <BodyText muted>Goals, capacity, consent, and accessibility preferences are saved through real API calls.</BodyText>
        <ActionButton label={settingsMutation.isPending ? "Saving..." : "Save safe default settings"} onPress={() => settingsMutation.mutate()} />
        <ErrorText error={settingsMutation.error} />
      </Panel>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <RouteHeader title={route.title} subtitle={route.subtitle} />
      {renderBody()}
      <Panel title="Next actions">
        <SecondaryLink href="/readiness" label="Readiness" />
        <SecondaryLink href="/daily-plan" label="Daily plan" />
        <SecondaryLink href="/exercises" label="Exercise library" />
        <SecondaryLink href="/privacy" label="Privacy" />
      </Panel>
    </ScrollView>
  );
}
