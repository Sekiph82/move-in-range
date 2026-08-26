import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, completeSession, patchSession, recordWorkoutFeedback, reportPain, startSession } from "../../api";
import { useTheme } from "../../theme";
import { useAppLanguage } from "../../i18n/LanguageProvider";
import { cueForCountdown, resetSpeechCueHistory, speakCue, type SpeechCueKey } from "../../guidance/speechCues";
import { ExerciseMediaFrame } from "../shared/ExerciseMediaFrame";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";
import type { MonthlyPlan, MovementPlan, PlanExerciseItem, ProgramDay, WeeklyPlan } from "../shared/productTypes";
import { readinessBlocksStart } from "../readiness/readinessGate";
import { readinessStartHref } from "../readiness/startContext";
import { assertCanonicalPlanItems } from "./WorkoutPreviewScreen";

type PlayerPhase = "IDLE" | "STARTING" | "PREPARING" | "WORKING" | "RESTING" | "SIDE_SWITCH" | "PAUSED" | "SUBSTITUTING" | "PAIN_CHECK" | "TRANSITIONING" | "COMPLETING" | "COMPLETED" | "STOPPED" | "ERROR";

type PlayerState = {
  phase: PlayerPhase;
  sessionId?: string;
  plan?: MovementPlan | null;
  activeIndex: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  phaseStartedAt: number | null;
  phaseBeforePause?: PlayerPhase;
  pausedRemainingSeconds?: number;
  pausedAt: number | null;
  completed: string[];
  skipped: string[];
  substituted: string[];
  painEvents: number;
  completionSubmitted: boolean;
  sound: boolean;
  haptics: boolean;
  error?: string;
};

const initialState: PlayerState = {
  phase: "IDLE",
  activeIndex: 0,
  remainingSeconds: 0,
  elapsedSeconds: 0,
  phaseStartedAt: null,
  phaseBeforePause: undefined,
  pausedRemainingSeconds: undefined,
  pausedAt: null,
  completed: [],
  skipped: [],
  substituted: [],
  painEvents: 0,
  completionSubmitted: false,
  sound: true,
  haptics: true
};

const effortOptions = ["Too easy", "Comfortable", "Challenging", "Too difficult"];
const painResponseOptions = ["No pain", "Mild discomfort", "Moderate pain", "Strong pain"];
const futurePreferenceOptions = ["Keep it similar", "Make it easier", "Make it harder", "More recovery", "Change focus"];
const feedbackBodyAreas = ["Shoulder", "Neck", "Back", "Hip", "Knee", "Ankle", "Arm", "Wrist/Hand", "Other"];

function secondsFor(item: PlanExerciseItem | undefined, phase: PlayerPhase) {
  if (!item) return 0;
  if (phase === "PREPARING") return item.preparation_seconds ?? 5;
  if (phase === "RESTING") return item.rest_seconds ?? 20;
  return item.work_seconds ?? item.duration_seconds ?? 45;
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function dayAsMovementPlan(parentPlan: { id?: string } | null | undefined, day: ProgramDay | undefined): MovementPlan | null {
  if (!day?.items?.length) return null;
  return {
    id: day.session_id ?? day.id ?? parentPlan?.id ?? `session-${day.date ?? day.day}`,
    date: day.date,
    session_type: day.session_type,
    total_minutes: day.duration_minutes ?? day.planned_duration,
    intensity: day.intensity,
    phase: day.focus,
    movement_count: day.items.length,
    media_summary: day.media_summary,
    items: day.items
  };
}

function selectedSessionPlan(plan: MovementPlan | WeeklyPlan | MonthlyPlan | null, sessionDate?: string, selectedDay?: string): MovementPlan | null {
  if (!plan) return null;
  if ("items" in plan && plan.items?.length) return plan;

  const weeklyDay = "days" in plan ? plan.days?.find((day) => day.date === sessionDate || day.day === selectedDay) : undefined;
  const monthlyDay = "weeks" in plan ? plan.weeks?.flatMap((week) => week.days ?? []).find((day) => day.date === sessionDate || day.day === selectedDay) : undefined;
  return dayAsMovementPlan(plan, weeklyDay ?? monthlyDay);
}

function phaseLabel(phase: PlayerPhase) {
  const labels: Record<PlayerPhase, string> = {
    IDLE: "Ready",
    STARTING: "Starting",
    PREPARING: "Get ready",
    WORKING: "Work",
    RESTING: "Rest",
    SIDE_SWITCH: "Switch side",
    PAUSED: "Paused",
    SUBSTITUTING: "Substitution",
    PAIN_CHECK: "Pain check",
    TRANSITIONING: "Next movement",
    COMPLETING: "Saving",
    COMPLETED: "Completed",
    STOPPED: "Stopped",
    ERROR: "Needs attention"
  };
  return labels[phase];
}

export function WorkoutScreen({ id }: { id?: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sessionDate?: string; selectedDay?: string; planId?: string }>();
  const { language, voiceEnabled, hapticsEnabled, t } = useAppLanguage();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PlayerState>(initialState);
  const [effort, setEffort] = useState("");
  const [painResponse, setPainResponse] = useState("");
  const [futurePreference, setFuturePreference] = useState("");
  const [feedbackPainAreas, setFeedbackPainAreas] = useState<string[]>([]);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const lastCueRef = useRef<string>("");
  const completionSubmittedRef = useRef(false);
  const autoResumeStartedRef = useRef(false);
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const readinessItem = readiness.data?.item;
  const blocked = readinessBlocksStart(readinessItem);
  const items = state.plan?.items ?? daily.data?.plan?.items ?? [];
  const activeItem = items[state.activeIndex];
  const nextItem = items[state.activeIndex + 1];
  const isExistingSessionRoute = Boolean(id && id !== "today");
  const hasDailyPreviewPlan = Boolean(daily.data?.plan?.items?.length);

  const start = useMutation({
    mutationFn: async () => {
      if (!id || id === "today") {
        const planId = daily.data?.plan?.id;
        router.replace(readinessStartHref({ source: "preview", planId, sessionDate: daily.data?.plan?.date, sessionType: daily.data?.plan?.session_type, returnTo: "/workout/today" }) as never);
        throw new Error("Complete readiness before starting this workout.");
      }
      const response = await startSession(id && id !== "today" ? params.planId : daily.data?.plan?.id, true);
      const planPayload = (response.session?.payload?.plan ?? daily.data?.plan ?? null) as MovementPlan | WeeklyPlan | MonthlyPlan | null;
      const plan = selectedSessionPlan(planPayload, params.sessionDate, params.selectedDay);
      if (!plan?.items?.length) throw new Error("Generate a plan before starting the guided player.");
      if (params.planId && "id" in plan && plan.id !== params.planId) throw new Error("Workout plan changed before start. Reopen the preview and try again.");
      assertCanonicalPlanItems(plan, (response.session?.payload?.plan ?? plan) as MovementPlan);
      const sessionItemIds = response.session?.payload?.plan_item_ids ?? [];
      const planItemIds = plan.items.map((item) => item.plan_item_id ?? item.id ?? item.exercise_id);
      if (sessionItemIds.length && sessionItemIds.join("|") !== planItemIds.join("|")) throw new Error("Workout session items do not match the selected preview.");
      return { sessionId: response.session.id as string, plan: plan as MovementPlan };
    },
    onSuccess: ({ sessionId, plan }) => {
      const first = plan.items?.[0];
      completionSubmittedRef.current = false;
      setState((current) => ({ ...current, phase: "PREPARING", sessionId, plan, activeIndex: 0, remainingSeconds: secondsFor(first, "PREPARING"), phaseStartedAt: Date.now(), completionSubmitted: false, error: undefined }));
    },
    onError: (error) => setState((current) => ({ ...current, phase: "ERROR", error: error instanceof Error ? error.message : String(error) }))
  });

  const syncSession = useMutation({ mutationFn: (payload: Record<string, unknown>) => patchSession(state.sessionId ?? "local-session", payload) });
  const complete = useMutation({
    mutationFn: () => completeSession(state.sessionId ?? "local-session"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      setState((current) => ({ ...current, phase: "COMPLETED", remainingSeconds: 0, phaseStartedAt: null }));
      playCue("workout.completed");
    }
  });
  const pain = useMutation({
    mutationFn: () => reportPain(state.sessionId ?? "local-session"),
    onSuccess: () => setState((current) => ({ ...current, phase: "PAIN_CHECK", painEvents: current.painEvents + 1, pausedAt: Date.now() }))
  });
  const feedback = useMutation({
    mutationFn: () => recordWorkoutFeedback({
      session_id: state.sessionId,
      plan_id: state.plan?.id,
      plan_version: state.plan?.plan_version,
      effort,
      pain_response: painResponse,
      pain_body_areas: feedbackPainAreas,
      future_preference: futurePreference,
      completed_exercises: state.completed,
      skipped_exercises: state.skipped,
      timestamp: new Date().toISOString(),
      idempotency_key: `feedback-${state.sessionId}-${state.plan?.id}`
    }),
    onSuccess: () => {
      setFeedbackSaved(true);
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    }
  });

  useEffect(() => {
    if (!isExistingSessionRoute || state.phase !== "IDLE" || autoResumeStartedRef.current) return;
    autoResumeStartedRef.current = true;
    start.mutate();
  }, [isExistingSessionRoute, state.phase]);

  useEffect(() => {
    if (!["PREPARING", "WORKING", "RESTING", "SIDE_SWITCH"].includes(state.phase) || !state.phaseStartedAt) return;
    const timer = setInterval(() => {
      setState((current) => {
        if (!["PREPARING", "WORKING", "RESTING", "SIDE_SWITCH"].includes(current.phase) || !current.phaseStartedAt) return current;
        const duration = secondsFor((current.plan?.items ?? [])[current.activeIndex], current.phase);
        const elapsed = Math.max(0, Math.floor((Date.now() - current.phaseStartedAt) / 1000));
        const remaining = Math.max(0, duration - elapsed);
        return { ...current, remainingSeconds: remaining, elapsedSeconds: current.elapsedSeconds + (remaining !== current.remainingSeconds ? 1 : 0) };
      });
    }, 500);
    return () => clearInterval(timer);
  }, [state.phase, state.phaseStartedAt]);

  useEffect(() => {
    if (!activeItem || state.phase === "IDLE" || state.phase === "PAUSED" || state.phase === "COMPLETED") return;
    const key = `${state.phase}:${state.activeIndex}:${state.remainingSeconds}`;
    if (lastCueRef.current === key) return;
    if (state.phase === "PREPARING" && state.remainingSeconds === secondsFor(activeItem, "PREPARING")) playCue("workout.getReady");
    const countdownCue = cueForCountdown(state.remainingSeconds);
    if (state.phase === "PREPARING" && countdownCue) playCue(countdownCue);
    if (state.phase === "WORKING" && state.remainingSeconds === 5) playCue("workout.fiveSeconds");
    if (state.phase === "RESTING" && countdownCue) playCue(countdownCue);
    lastCueRef.current = key;
  }, [activeItem, state]);

  useEffect(() => {
    if (!activeItem || state.remainingSeconds > 0 || !["PREPARING", "WORKING", "RESTING", "SIDE_SWITCH"].includes(state.phase)) return;
    if (state.phase === "PREPARING") {
      setState((current) => ({ ...current, phase: "WORKING", remainingSeconds: secondsFor(activeItem, "WORKING"), phaseStartedAt: Date.now() }));
      playCue("workout.start");
      return;
    }
    if (state.phase === "WORKING") {
      const completed = [...state.completed, activeItem.exercise_id];
      if (state.activeIndex >= items.length - 1) {
        setState((current) => ({ ...current, phase: "COMPLETING", completed, phaseStartedAt: null }));
        requestCompletion();
        return;
      }
      setState((current) => ({ ...current, phase: "RESTING", completed, remainingSeconds: secondsFor(activeItem, "RESTING"), phaseStartedAt: Date.now() }));
      playCue("workout.rest");
      return;
    }
    if (state.phase === "RESTING" || state.phase === "SIDE_SWITCH") {
      const nextIndex = Math.min(items.length - 1, state.activeIndex + 1);
      setState((current) => ({ ...current, phase: "TRANSITIONING", activeIndex: nextIndex, remainingSeconds: 1, phaseStartedAt: Date.now() }));
      setTimeout(() => setState((current) => ({ ...current, phase: "PREPARING", remainingSeconds: secondsFor(items[nextIndex], "PREPARING"), phaseStartedAt: Date.now() })), 250);
    }
  }, [state.remainingSeconds, state.phase, activeItem, items, state]);

  const progressText = useMemo(() => `${Math.min(state.activeIndex + 1, Math.max(1, items.length))} of ${Math.max(1, items.length)}`, [state.activeIndex, items.length]);
  const playCue = (key: SpeechCueKey) => {
    if (state.haptics && hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    speakCue(key, { language, enabled: state.sound && voiceEnabled });
  };

  const pausePlayer = () => {
    setState((current) => ({ ...current, phaseBeforePause: current.phase, pausedRemainingSeconds: current.remainingSeconds, phase: "PAUSED", pausedAt: Date.now(), phaseStartedAt: null }));
    syncSession.mutate({ status: "paused", elapsed_seconds: state.elapsedSeconds, current_index: state.activeIndex, payload: { player_phase: "PAUSED" } });
    playCue("workout.paused");
  };
  const resumePlayer = () => {
    setState((current) => {
      const resumedPhase = current.phaseBeforePause && current.phaseBeforePause !== "PAUSED" ? current.phaseBeforePause : "WORKING";
      const item = (current.plan?.items ?? [])[current.activeIndex];
      const duration = secondsFor(item, resumedPhase);
      const remaining = Math.max(1, current.pausedRemainingSeconds ?? current.remainingSeconds ?? duration);
      return {
        ...current,
        phase: resumedPhase,
        remainingSeconds: remaining,
        phaseStartedAt: Date.now() - Math.max(0, duration - remaining) * 1000,
        pausedAt: null,
        phaseBeforePause: undefined,
        pausedRemainingSeconds: undefined
      };
    });
    syncSession.mutate({ status: "in_progress", current_index: state.activeIndex, payload: { player_phase: "WORKING" } });
    playCue("workout.resumed");
  };
  const skip = () => {
    setState((current) => {
      const nextIndex = Math.min(items.length - 1, current.activeIndex + 1);
      return { ...current, skipped: [...current.skipped, activeItem?.exercise_id ?? "unknown"], activeIndex: nextIndex, phase: nextIndex === current.activeIndex ? "COMPLETING" : "PREPARING", remainingSeconds: secondsFor(items[nextIndex], "PREPARING"), phaseStartedAt: Date.now() };
    });
  };
  const requestCompletion = () => {
    if (completionSubmittedRef.current || state.completionSubmitted) return;
    completionSubmittedRef.current = true;
    setState((current) => ({ ...current, completionSubmitted: true, phase: "COMPLETING", phaseStartedAt: null }));
    complete.mutate();
  };
  const confirmCompletion = () => {
    Alert.alert(t("workout.confirmFinish"), "Your completed movements will be saved once.", [
      { text: "Cancel", style: "cancel" },
      { text: t("workout.finish"), style: "destructive", onPress: requestCompletion }
    ]);
  };
  const confirmExit = () => {
    Alert.alert(t("workout.confirmExit"), "Progress remains paused unless you finish the session.", [
      { text: "Cancel", style: "cancel" },
      {
        text: t("workout.exit"),
        style: "destructive",
        onPress: () => {
          resetSpeechCueHistory();
          setState((current) => ({ ...current, phase: "STOPPED", phaseStartedAt: null }));
          router.replace("/daily-plan" as never);
        }
      }
    ]);
  };

  if (daily.isLoading && state.phase === "IDLE") return <LoadingState label="Loading workout plan" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: Math.max(18, insets.top + 10), paddingBottom: Math.max(24, insets.bottom + 28), gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("workout.exit")} onPress={confirmExit} style={{ minHeight: 44, minWidth: 64, borderRadius: 8, borderColor: theme.border, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface }}>
          <Text style={{ color: theme.safety, fontWeight: "900" }}>{t("workout.exit")}</Text>
        </Pressable>
        <Text style={{ color: theme.muted, fontWeight: "800" }}>{state.phase === "IDLE" ? "Preview" : `Exercise ${progressText}`}</Text>
      </View>
      <Panel title="Guided workout">
        {state.phase === "IDLE" || state.phase === "ERROR" ? (
          <>
            <PlanReadyPreview plan={daily.data?.plan} />
            <ActionButton label={isExistingSessionRoute ? start.isPending ? "Resuming..." : "Resume guided workout" : "Check readiness & start"} disabled={blocked || (!isExistingSessionRoute && !hasDailyPreviewPlan)} onPress={() => start.mutate()} />
            <ErrorText error={start.error ?? (state.error ? new Error(state.error) : undefined)} />
          </>
        ) : null}
        {activeItem && state.phase !== "IDLE" && state.phase !== "ERROR" ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ color: theme.primary, fontWeight: "800" }}>{activeItem.section ?? activeItem.block ?? "Movement"}</Text>
              <Text style={{ color: theme.muted, fontWeight: "700" }}>{progressText}</Text>
            </View>
            <ExerciseMediaFrame media={activeItem.media} title={activeItem.name} section={activeItem.section} target={activeItem.equipment} size="hero" />
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>{activeItem.name}</Text>
            <Text style={{ color: theme.muted }}>Exercise {progressText} - {activeItem.position ?? "standing"} - {activeItem.impact ?? "low"} impact - {phaseLabel(state.phase)}</Text>
            <Text accessibilityLabel="Workout timer" style={{ color: theme.text, fontSize: 56, fontWeight: "900", textAlign: "center" }}>{formatClock(state.remainingSeconds)}</Text>
            <BodyText>{activeItem.instructions?.[0] ?? activeItem.description ?? "Move with control and keep breathing steady."}</BodyText>
            {nextItem && ["RESTING", "TRANSITIONING"].includes(state.phase) ? (
              <View style={{ borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 10, gap: 8 }}>
                <Text style={{ color: theme.text, fontWeight: "800" }}>Next: {nextItem.name}</Text>
                <ExerciseMediaFrame media={nextItem.media} title={nextItem.name} section={nextItem.section} target={nextItem.equipment} />
              </View>
            ) : null}
            <PlayerControls phase={state.phase} onPause={pausePlayer} onResume={resumePlayer} onSkip={skip} onPain={() => pain.mutate()} onSubstitute={() => setState((current) => ({ ...current, phase: "SUBSTITUTING" }))} onEnd={confirmExit} onComplete={confirmCompletion} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: state.sound }} onPress={() => setState((current) => ({ ...current, sound: !current.sound }))} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ color: theme.primary, fontWeight: "800" }}>Sound {state.sound ? "on" : "off"}</Text>
              </Pressable>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: state.haptics }} onPress={() => setState((current) => ({ ...current, haptics: !current.haptics }))} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ color: theme.primary, fontWeight: "800" }}>Haptics {state.haptics ? "on" : "off"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {state.phase === "COMPLETED" ? (
          <View style={{ gap: 10 }}>
            {feedbackSaved ? (
              <>
                <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Workout complete</Text>
                <BodyText>Completed {state.completed.length} movements, skipped {state.skipped.length}. Feedback saved.</BodyText>
                <BodyText muted>Future plans will use this cautiously without changing completed history.</BodyText>
                <ActionButton label="Done" onPress={() => router.replace("/(tabs)" as never)} />
                <SecondaryLink href="/progress" label="View progress" />
              </>
            ) : (
              <>
                <BodyText>Session complete. Choose how this workout felt before saving feedback.</BodyText>
                <BodyText>Overall effort</BodyText>
                <ChipGroup labels={effortOptions} selected={effort ? [effort] : []} onToggle={setEffort} />
                <BodyText>Pain response</BodyText>
                <ChipGroup labels={painResponseOptions} selected={painResponse ? [painResponse] : []} onToggle={(value) => {
                  setPainResponse(value);
                  if (value === "No pain") setFeedbackPainAreas([]);
                }} />
                {painResponse && painResponse !== "No pain" ? (
                  <>
                    <BodyText>Feedback pain areas</BodyText>
                    <ChipGroup labels={feedbackBodyAreas} selected={feedbackPainAreas} onToggle={(value) => setFeedbackPainAreas(feedbackPainAreas.includes(value) ? feedbackPainAreas.filter((item) => item !== value) : [...feedbackPainAreas, value])} />
                  </>
                ) : null}
                <BodyText>Future preference</BodyText>
                <ChipGroup labels={futurePreferenceOptions} selected={futurePreference ? [futurePreference] : []} onToggle={setFuturePreference} />
                <ActionButton label={feedback.isPending ? "Saving feedback..." : "Save feedback"} disabled={!state.sessionId || !effort || !painResponse || !futurePreference || feedback.isPending} onPress={() => feedback.mutate()} />
                <SecondaryLink href={`/workout/${state.sessionId ?? "local-session"}/feedback`} label="Open detailed feedback" />
              </>
            )}
          </View>
        ) : null}
        {state.phase === "SUBSTITUTING" ? <SubstitutionPanel item={activeItem} onReturn={() => setState((current) => ({ ...current, phase: "PAUSED" }))} /> : null}
        {state.phase === "PAIN_CHECK" ? <PainPanel onReturn={() => setState((current) => ({ ...current, phase: "PAUSED" }))} onEnd={() => setState((current) => ({ ...current, phase: "STOPPED" }))} /> : null}
        <ErrorText error={syncSession.error ?? complete.error ?? pain.error ?? feedback.error} />
      </Panel>
    </ScrollView>
  );
}

function PlanReadyPreview({ plan }: { plan?: MovementPlan | null }) {
  return (
    <View style={{ gap: 10 }}>
      <BodyText>{plan ? `${plan.total_minutes ?? plan.total_duration ?? 0} minutes, ${plan.items?.length ?? 0} movements` : "Generate a daily plan before starting."}</BodyText>
      {(plan?.items ?? []).slice(0, 2).map((item) => <ExerciseMediaFrame key={item.exercise_id} media={item.media} title={item.name} section={item.section} target={item.equipment} />)}
    </View>
  );
}

function PlayerControls({ phase, onPause, onResume, onSkip, onPain, onSubstitute, onEnd, onComplete }: { phase: PlayerPhase; onPause: () => void; onResume: () => void; onSkip: () => void; onPain: () => void; onSubstitute: () => void; onEnd: () => void; onComplete: () => void }) {
  if (phase === "PAUSED") {
    return (
      <View style={{ gap: 10 }}>
        <ActionButton label="Resume" onPress={onResume} />
        <ActionButton tone="safety" label="End session" onPress={onEnd} />
      </View>
    );
  }
  if (phase === "COMPLETING") return <LoadingState label="Completing session" />;
  if (phase === "COMPLETED" || phase === "STOPPED") return null;
  return (
    <View style={{ gap: 10 }}>
      <ActionButton label="Pause" onPress={onPause} />
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <View style={{ flexGrow: 1, minWidth: 120 }}><ActionButton label="Skip" onPress={onSkip} /></View>
        <View style={{ flexGrow: 1, minWidth: 120 }}><ActionButton label="Substitute" onPress={onSubstitute} /></View>
        <View style={{ flexGrow: 1, minWidth: 120 }}><ActionButton tone="safety" label="Pain" onPress={onPain} /></View>
        <View style={{ flexGrow: 1, minWidth: 120 }}><ActionButton tone="safety" label="Finish" onPress={onComplete} /></View>
      </View>
    </View>
  );
}

function SubstitutionPanel({ item, onReturn }: { item?: PlanExerciseItem; onReturn: () => void }) {
  return (
    <View style={{ gap: 10 }}>
      <BodyText>Choose a compatible easier movement with the same intent and available equipment.</BodyText>
      {(item?.approved_substitutions ?? []).slice(0, 3).map((id) => <SecondaryLink key={id} href={`/exercise/${id}`} label={`Preview ${id}`} />)}
      <ActionButton label="Return paused" onPress={onReturn} />
    </View>
  );
}

function PainPanel({ onReturn, onEnd }: { onReturn: () => void; onEnd: () => void }) {
  return (
    <View style={{ gap: 10 }}>
      <BodyText>Pause and choose the safer next step. Stop if pain is sharp, worsening, or paired with concerning symptoms.</BodyText>
      <ActionButton label="Try easier option" onPress={onReturn} />
      <ActionButton tone="safety" label="End session" onPress={onEnd} />
    </View>
  );
}

export function WorkoutEventScreen({ kind, id }: { kind: "workout-pain" | "workout-symptom" | "workout-feedback"; id?: string }) {
  const queryClient = useQueryClient();
  const [symptoms, setSymptoms] = useState<string[]>(["dizziness"]);
  const [notes, setNotes] = useState("");
  const sessionId = id ?? "local-session";
  const mutation = useMutation({
    mutationFn: () => {
      if (kind === "workout-pain") return reportPain(sessionId);
      if (kind === "workout-symptom") return apiFetch(`/sessions/${sessionId}/symptoms`, { method: "POST", body: JSON.stringify({ symptoms, note: notes, idempotency_key: `symptom-${Date.now()}` }) });
      return completeSession(sessionId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insights"] })
  });
  return (
    <Panel title={kind === "workout-feedback" ? "Post-workout feedback" : "Session safety event"}>
      {kind === "workout-symptom" ? <ChipGroup labels={["dizziness", "chest discomfort", "unusual shortness of breath", "nausea", "faintness"]} selected={symptoms} onToggle={(value) => setSymptoms(symptoms.includes(value) ? symptoms.filter((item) => item !== value) : [...symptoms, value])} /> : null}
      {kind === "workout-feedback" ? <BodyText>Completion, exertion, energy, pain, symptoms, enjoyment, glucose context, and notes are persisted after movement.</BodyText> : null}
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ActionButton tone={kind === "workout-symptom" ? "safety" : "primary"} label={mutation.isPending ? "Saving..." : "Save event"} onPress={() => mutation.mutate()} />
      <ErrorText error={mutation.error} />
    </Panel>
  );
}
