import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, completeSession, reportPain, startSession } from "../../api";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";

export function WorkoutScreen({ id }: { id?: string }) {
  const [lastSessionId, setLastSessionId] = useState(id);
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<any>("/plans/daily/today") });
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const blocked = readiness.data?.item?.decision?.action === "BLOCK";
  const workoutMutation = useMutation({
    mutationFn: async () => {
      const started = await startSession(daily.data?.plan?.id);
      setLastSessionId(started.session.id);
      return started;
    }
  });
  return (
    <>
      <Panel title="Workout controls">
        <BodyText>{blocked ? "Readiness is blocked; start is disabled." : "Preparation, work, rest, pause, skip, substitute, and completion controls are available for the current plan."}</BodyText>
        <ActionButton label={workoutMutation.isPending ? "Starting..." : "Start guided workout"} disabled={blocked} onPress={() => workoutMutation.mutate()} />
        <SecondaryLink href={`/workout/${lastSessionId ?? "local-session"}/pain`} label="Report pain" />
        <SecondaryLink href={`/workout/${lastSessionId ?? "local-session"}/symptom`} label="Report symptoms" />
        <SecondaryLink href={`/workout/${lastSessionId ?? "local-session"}/feedback`} label="Finish with feedback" />
        <ErrorText error={workoutMutation.error} />
      </Panel>
      <Panel title="Plan items">
        {daily.isLoading ? <LoadingState /> : null}
        {(daily.data?.plan?.items ?? []).map((item: any) => <BodyText key={`${item.block}-${item.exercise_id}`}>{item.block}: {item.name}</BodyText>)}
        {!daily.data?.plan ? <BodyText muted>No daily plan loaded. Generate a daily plan first.</BodyText> : null}
      </Panel>
    </>
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
      {kind === "workout-feedback" ? <BodyText>Completion, actual duration, exertion, energy, pain, symptoms, enjoyment, glucose context, and notes are persisted through the session completion API.</BodyText> : null}
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ActionButton tone={kind === "workout-symptom" ? "safety" : "primary"} label={mutation.isPending ? "Saving..." : "Save event"} onPress={() => mutation.mutate()} />
      <ErrorText error={mutation.error} />
    </Panel>
  );
}
