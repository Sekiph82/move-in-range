import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, createQuickSession, generateDailyPlan, generateMonthlyPlan, generateWeeklyPlan, modifyPlan } from "../../api";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";

const MODIFICATION_OPTIONS = ["shorter", "easier", "harder", "no floor", "seated", "standing", "quieter", "no cardio", "avoid knee", "avoid shoulder", "upper body", "lower body", "change focus", "equipment unavailable", "more rest", "less rest", "substitute exercise"];

export function DailyPlanScreen() {
  const [minutes, setMinutes] = useState("15");
  const [changes, setChanges] = useState<string[]>(["easier"]);
  const queryClient = useQueryClient();
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<any>("/plans/daily/today") });
  const generate = useMutation({ mutationFn: () => generateDailyPlan(Number(minutes) || 15), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const modify = useMutation({
    mutationFn: () => modifyPlan(daily.data?.plan?.id, changes[0] ?? "make_easier", { requested_changes: changes, reason: "user_adjustment" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] })
  });
  const items = daily.data?.plan?.items ?? [];
  return (
    <>
      <Panel title="Plan controls">
        <TextField label="Available minutes" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} />
        <ActionButton label={generate.isPending ? "Generating..." : "Generate daily plan"} onPress={() => generate.mutate()} />
        <ErrorText error={generate.error} />
      </Panel>
      <Panel title="Daily plan summary">
        {daily.isLoading ? <LoadingState /> : null}
        <BodyText>Total duration: {daily.data?.plan?.total_duration ?? 0} minutes</BodyText>
        {items.map((item: any) => <BodyText key={`${item.block}-${item.exercise_id}`}>{item.block}: {item.name} - {item.duration_minutes ?? item.durationSeconds ?? "timed"} min</BodyText>)}
        {!items.length ? <BodyText muted>No generated plan yet.</BodyText> : null}
        <SecondaryLink href={`/workout/${daily.data?.plan?.id ?? "daily-local"}`} label="Start guided workout" />
      </Panel>
      <Panel title="Modify plan">
        <ChipGroup labels={MODIFICATION_OPTIONS} selected={changes} onToggle={(value) => setChanges(changes.includes(value) ? changes.filter((item) => item !== value) : [...changes, value])} />
        <BodyText muted>Unsafe or contradictory changes are interpreted by the backend before a modified preview is persisted.</BodyText>
        <ActionButton label={modify.isPending ? "Applying..." : "Apply modification"} disabled={!daily.data?.plan?.id} onPress={() => modify.mutate()} />
        <ErrorText error={modify.error} />
      </Panel>
    </>
  );
}

export function QuickSessionScreen() {
  const [minutes, setMinutes] = useState("8");
  const [focus, setFocus] = useState<string[]>(["core"]);
  const quick = useMutation({ mutationFn: () => createQuickSession({ available_minutes: Number(minutes) || 8, pain: 2, energy: 3, chair_only: true, equipment: ["chair"], target_focuses: focus, natural_request: `${minutes} minute ${focus.join(" ")} chair session` }) });
  const items = (quick.data as any)?.plan?.items ?? [];
  return (
    <>
      <Panel title="Quick session request">
        <TextField label="Duration minutes" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} />
        <ChipGroup labels={["core", "back", "balance", "upper body", "lower body"]} selected={focus} onToggle={(value) => setFocus(focus.includes(value) ? focus.filter((item) => item !== value) : [...focus, value])} />
        <ActionButton label={quick.isPending ? "Creating..." : "Create quick session"} onPress={() => quick.mutate()} />
        <ErrorText error={quick.error} />
      </Panel>
      <Panel title="Generated result">
        {items.map((item: any) => <BodyText key={`${item.block}-${item.exercise_id}`}>{item.block}: {item.name}</BodyText>)}
        {!items.length ? <BodyText muted>No quick session created yet.</BodyText> : null}
      </Panel>
    </>
  );
}

export function WeeklyPlanScreen() {
  const queryClient = useQueryClient();
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => apiFetch<any>("/plans/weekly/current") });
  const generate = useMutation({ mutationFn: generateWeeklyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly"] }) });
  return (
    <Panel title="Seven-day view">
      {(weekly.data?.plan?.days ?? []).map((day: any) => <BodyText key={day.day}>{day.day}: {day.status} - {day.focus ?? "recovery-aware"} - {day.duration_minutes ?? 0} min</BodyText>)}
      {weekly.isLoading ? <LoadingState /> : null}
      {!weekly.data?.plan ? <BodyText muted>No weekly plan saved yet.</BodyText> : null}
      <ActionButton label={generate.isPending ? "Generating..." : "Generate weekly plan"} onPress={() => generate.mutate()} />
    </Panel>
  );
}

export function MonthlyPlanScreen() {
  const queryClient = useQueryClient();
  const monthly = useQuery({ queryKey: ["monthly"], queryFn: () => apiFetch<any>("/plans/monthly/current") });
  const generate = useMutation({ mutationFn: generateMonthlyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly"] }) });
  return (
    <Panel title="Four-week progression">
      {(monthly.data?.plan?.weeks ?? []).map((week: any) => <BodyText key={week.week}>Week {week.week}: {week.phase} - {week.status ?? "planned"}</BodyText>)}
      {monthly.isLoading ? <LoadingState /> : null}
      {!monthly.data?.plan ? <BodyText muted>No monthly phase view saved yet.</BodyText> : null}
      <ActionButton label={generate.isPending ? "Generating..." : "Generate monthly plan"} onPress={() => generate.mutate()} />
    </Panel>
  );
}
