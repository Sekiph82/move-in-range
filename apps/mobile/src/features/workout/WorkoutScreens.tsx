import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, completeSession, patchSession, recordExerciseFeedback, reportPain, startSession } from "../../api";
import { useTheme } from "../../theme";
import { ExerciseMediaFrame } from "../shared/ExerciseMediaFrame";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";
import type { MovementPlan, PlanExerciseItem } from "../shared/productTypes";

type PlayerPhase = "IDLE" | "STARTING" | "PREPARING" | "WORKING" | "RESTING" | "SIDE_SWITCH" | "PAUSED" | "SUBSTITUTING" | "PAIN_CHECK" | "TRANSITIONING" | "COMPLETING" | "COMPLETED" | "STOPPED" | "ERROR";

type PlayerState = {
  phase: PlayerPhase;
  sessionId?: string;
  plan?: MovementPlan | null;
  activeIndex: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  phaseStartedAt: number | null;
  pausedAt: number | null;
  completed: string[];
  skipped: string[];
  substituted: string[];
  painEvents: number;
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
  pausedAt: null,
  completed: [],
  skipped: [],
  substituted: [],
  painEvents: 0,
  sound: true,
  haptics: true
};

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

function cue(text: string, state: PlayerState) {
  if (state.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  if (state.sound) Speech.speak(text, { rate: 0.94 });
}

export function WorkoutScreen({ id }: { id?: string }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PlayerState>(initialState);
  const lastCueRef = useRef<string>("");
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const blocked = readiness.data?.item?.decision?.action === "BLOCK_AND_SHOW_SAFETY_MESSAGE";
  const items = state.plan?.items ?? daily.data?.plan?.items ?? [];
  const activeItem = items[state.activeIndex];
  const nextItem = items[state.activeIndex + 1];

  const start = useMutation({
    mutationFn: async () => {
      const response = await startSession(id && id !== "today" ? undefined : daily.data?.plan?.id);
      const plan = (response.session?.payload?.plan ?? daily.data?.plan ?? null) as MovementPlan | null;
      if (!plan?.items?.length) throw new Error("Generate a plan before starting the guided player.");
      return { sessionId: response.session.id as string, plan: plan as MovementPlan };
    },
    onSuccess: ({ sessionId, plan }) => {
      const first = plan.items?.[0];
      setState((current) => ({ ...current, phase: "PREPARING", sessionId, plan, activeIndex: 0, remainingSeconds: secondsFor(first, "PREPARING"), phaseStartedAt: Date.now(), error: undefined }));
    },
    onError: (error) => setState((current) => ({ ...current, phase: "ERROR", error: error instanceof Error ? error.message : String(error) }))
  });

  const syncSession = useMutation({ mutationFn: (payload: Record<string, unknown>) => patchSession(state.sessionId ?? "local-session", payload) });
  const complete = useMutation({
    mutationFn: () => completeSession(state.sessionId ?? "local-session"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      setState((current) => ({ ...current, phase: "COMPLETED", remainingSeconds: 0, phaseStartedAt: null }));
      cue("Session complete", state);
    }
  });
  const pain = useMutation({
    mutationFn: () => reportPain(state.sessionId ?? "local-session"),
    onSuccess: () => setState((current) => ({ ...current, phase: "PAIN_CHECK", painEvents: current.painEvents + 1, pausedAt: Date.now() }))
  });
  const feedback = useMutation({ mutationFn: () => recordExerciseFeedback(state.sessionId ?? "local-session") });

  useEffect(() => {
    if (!["PREPARING", "WORKING", "RESTING", "SIDE_SWITCH"].includes(state.phase) || !state.phaseStartedAt) return;
    const timer = setInterval(() => {
      setState((current) => {
        if (!["PREPARING", "WORKING", "RESTING", "SIDE_SWITCH"].includes(current.phase) || !current.phaseStartedAt) return current;
        const duration = secondsFor((current.plan?.items ?? [])[current.activeIndex], current.phase);
        const elapsed = Math.floor((Date.now() - current.phaseStartedAt) / 1000);
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
    if (state.phase === "PREPARING" && state.remainingSeconds === secondsFor(activeItem, "PREPARING")) cue("Get ready", state);
    if (state.phase === "PREPARING" && state.remainingSeconds <= 3 && state.remainingSeconds > 0) cue(String(state.remainingSeconds), state);
    if (state.phase === "WORKING" && state.remainingSeconds === 5) cue("Five seconds", state);
    if (state.phase === "RESTING" && state.remainingSeconds <= 3 && state.remainingSeconds > 0) cue(String(state.remainingSeconds), state);
    lastCueRef.current = key;
  }, [activeItem, state]);

  useEffect(() => {
    if (!activeItem || state.remainingSeconds > 0 || !["PREPARING", "WORKING", "RESTING", "SIDE_SWITCH"].includes(state.phase)) return;
    if (state.phase === "PREPARING") {
      setState((current) => ({ ...current, phase: "WORKING", remainingSeconds: secondsFor(activeItem, "WORKING"), phaseStartedAt: Date.now() }));
      cue("Start", state);
      return;
    }
    if (state.phase === "WORKING") {
      const completed = [...state.completed, activeItem.exercise_id];
      if (state.activeIndex >= items.length - 1) {
        setState((current) => ({ ...current, phase: "COMPLETING", completed, phaseStartedAt: null }));
        complete.mutate();
        return;
      }
      setState((current) => ({ ...current, phase: "RESTING", completed, remainingSeconds: secondsFor(activeItem, "RESTING"), phaseStartedAt: Date.now() }));
      cue("Rest. Next movement soon.", state);
      return;
    }
    if (state.phase === "RESTING" || state.phase === "SIDE_SWITCH") {
      const nextIndex = Math.min(items.length - 1, state.activeIndex + 1);
      setState((current) => ({ ...current, phase: "TRANSITIONING", activeIndex: nextIndex, remainingSeconds: 1, phaseStartedAt: Date.now() }));
      setTimeout(() => setState((current) => ({ ...current, phase: "PREPARING", remainingSeconds: secondsFor(items[nextIndex], "PREPARING"), phaseStartedAt: Date.now() })), 250);
    }
  }, [state.remainingSeconds, state.phase, activeItem, items, complete, state]);

  const progressText = useMemo(() => `${Math.min(state.activeIndex + 1, Math.max(1, items.length))} of ${Math.max(1, items.length)}`, [state.activeIndex, items.length]);

  const pausePlayer = () => {
    setState((current) => ({ ...current, phase: "PAUSED", pausedAt: Date.now(), phaseStartedAt: null }));
    syncSession.mutate({ status: "paused", elapsed_seconds: state.elapsedSeconds, current_index: state.activeIndex, payload: { player_phase: "PAUSED" } });
    cue("Paused", state);
  };
  const resumePlayer = () => {
    setState((current) => ({ ...current, phase: "WORKING", phaseStartedAt: Date.now(), pausedAt: null }));
    syncSession.mutate({ status: "in_progress", current_index: state.activeIndex, payload: { player_phase: "WORKING" } });
    cue("Resumed", state);
  };
  const skip = () => {
    setState((current) => {
      const nextIndex = Math.min(items.length - 1, current.activeIndex + 1);
      return { ...current, skipped: [...current.skipped, activeItem?.exercise_id ?? "unknown"], activeIndex: nextIndex, phase: nextIndex === current.activeIndex ? "COMPLETING" : "PREPARING", remainingSeconds: secondsFor(items[nextIndex], "PREPARING"), phaseStartedAt: Date.now() };
    });
  };

  if (daily.isLoading && state.phase === "IDLE") return <LoadingState label="Loading workout plan" />;

  return (
    <>
      <Panel title="Guided workout player">
        {state.phase === "IDLE" || state.phase === "ERROR" ? (
          <>
            <PlanReadyPreview plan={daily.data?.plan} />
            <ActionButton label={start.isPending ? "Opening player..." : "Start guided session"} disabled={blocked || !daily.data?.plan?.items?.length} onPress={() => start.mutate()} />
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
            <Text style={{ color: theme.muted }}>{state.phase.replace("_", " ")} - {activeItem.position ?? "standing"} - {activeItem.impact ?? "low"} impact</Text>
            <Text accessibilityLabel="Workout timer" style={{ color: theme.text, fontSize: 56, fontWeight: "900", textAlign: "center" }}>{formatClock(state.remainingSeconds)}</Text>
            <BodyText>{activeItem.instructions?.[0] ?? activeItem.description ?? "Move with control and keep breathing steady."}</BodyText>
            {nextItem && ["RESTING", "TRANSITIONING"].includes(state.phase) ? (
              <View style={{ borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 10, gap: 8 }}>
                <Text style={{ color: theme.text, fontWeight: "800" }}>Next: {nextItem.name}</Text>
                <ExerciseMediaFrame media={nextItem.media} title={nextItem.name} section={nextItem.section} target={nextItem.equipment} />
              </View>
            ) : null}
            <PlayerControls phase={state.phase} onPause={pausePlayer} onResume={resumePlayer} onSkip={skip} onPain={() => pain.mutate()} onSubstitute={() => setState((current) => ({ ...current, phase: "SUBSTITUTING" }))} onEnd={() => setState((current) => ({ ...current, phase: "STOPPED", phaseStartedAt: null }))} onComplete={() => complete.mutate()} />
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
            <BodyText>Session complete. Completed {state.completed.length} movements, skipped {state.skipped.length}, pain events {state.painEvents}.</BodyText>
            <ActionButton label={feedback.isPending ? "Saving feedback..." : "Save quick feedback"} disabled={!state.sessionId} onPress={() => feedback.mutate()} />
            <SecondaryLink href={`/workout/${state.sessionId ?? "local-session"}/feedback`} label="Open full feedback" />
          </View>
        ) : null}
        {state.phase === "SUBSTITUTING" ? <SubstitutionPanel item={activeItem} onReturn={() => setState((current) => ({ ...current, phase: "PAUSED" }))} /> : null}
        {state.phase === "PAIN_CHECK" ? <PainPanel onReturn={() => setState((current) => ({ ...current, phase: "PAUSED" }))} onEnd={() => setState((current) => ({ ...current, phase: "STOPPED" }))} /> : null}
        <ErrorText error={syncSession.error ?? complete.error ?? pain.error ?? feedback.error} />
      </Panel>
    </>
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
        <Pressable accessibilityRole="button" accessibilityLabel="Skip movement" onPress={onSkip} style={{ minHeight: 44, justifyContent: "center" }}><BodyText>Skip</BodyText></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Substitute movement" onPress={onSubstitute} style={{ minHeight: 44, justifyContent: "center" }}><BodyText>Substitute</BodyText></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Report pain" onPress={onPain} style={{ minHeight: 44, justifyContent: "center" }}><BodyText>Pain</BodyText></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Complete now" onPress={onComplete} style={{ minHeight: 44, justifyContent: "center" }}><BodyText>Finish</BodyText></Pressable>
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
