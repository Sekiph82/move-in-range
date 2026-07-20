import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, createQuickSession, generateDailyPlan, generateMonthlyPlan, generateWeeklyPlan, modifyPlan, startSession } from "../../api";
import { useTheme } from "../../theme";
import { ExerciseMediaFrame } from "../shared/ExerciseMediaFrame";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";
import type { MonthWeek, MovementPlan, PlanExerciseItem, ProgramDay } from "../shared/productTypes";

const MODIFICATION_OPTIONS = ["shorter", "easier", "no floor", "seated", "standing", "no cardio", "avoid knee", "avoid shoulder", "more rest", "substitute exercise"];
const READY_MADE = ["Gentle Daily Mobility", "Seven-Day Joint-Friendly Movement", "Four-Week Mobility Foundation", "Chair-Supported Movement", "Low-Impact Cardio", "Balance and Stability", "Shoulder Mobility", "Lower-Back Comfort", "Beginner Recovery Movement"];

function minutesFor(item: PlanExerciseItem) {
  return Math.max(1, Math.round((item.duration_seconds ?? item.work_seconds ?? 60) / 60));
}

function MovementCard({ item, action }: { item: PlanExerciseItem; action?: "detail" | "replace" }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, backgroundColor: theme.surface }}>
      <ExerciseMediaFrame media={item.media} title={item.name} section={item.section ?? item.block} target={item.targets?.[0] ?? item.equipment} />
      <View style={{ gap: 4 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>{item.order ? `${item.order}. ` : ""}{item.name}</Text>
        <Text style={{ color: theme.muted }}>{item.section ?? item.block ?? "movement"} - {minutesFor(item)} min - rest {item.rest_seconds ?? 20}s</Text>
        <Text style={{ color: theme.muted }}>{item.position ?? "standing"} - {item.difficulty ?? "gentle"} - {item.impact ?? "low"} impact - {item.equipment ?? "body weight"}</Text>
        <Text style={{ color: theme.text }}>{item.breathing_cue ?? "Breathe steadily and move with control."}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <SecondaryLink href={`/exercise/${item.exercise_id}`} label={action === "replace" ? "Preview substitute" : "View details"} />
        <Text style={{ color: item.media?.playable ? theme.primary : theme.muted, fontWeight: "700" }}>{item.media?.playable ? "Playable media" : "Guided fallback"}</Text>
      </View>
    </View>
  );
}

function PlanSummary({ plan }: { plan?: MovementPlan | null }) {
  if (!plan) return <BodyText muted>No plan is available yet.</BodyText>;
  return (
    <View style={{ gap: 8 }}>
      <BodyText>{plan.total_minutes ?? plan.total_duration ?? 0} minutes - {plan.movement_count ?? plan.items?.length ?? 0} movements - {plan.intensity ?? "low"} intensity</BodyText>
      <BodyText muted>{plan.safety_decision?.explanation ?? plan.explanation ?? "Generated from readiness, equipment, and safety preferences."}</BodyText>
      <BodyText muted>Media: {plan.media_summary?.playable ?? 0} approved, {plan.media_summary?.fallback ?? plan.items?.length ?? 0} guided fallback.</BodyText>
    </View>
  );
}

export function DailyPlanScreen() {
  const [minutes, setMinutes] = useState("15");
  const [changes, setChanges] = useState<string[]>(["easier"]);
  const queryClient = useQueryClient();
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const generate = useMutation({ mutationFn: () => generateDailyPlan(Number(minutes) || 15), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const start = useMutation({
    mutationFn: async () => startSession(daily.data?.plan?.id),
    onSuccess: (data) => router.push(`/workout/${data.session.id}` as never)
  });
  const modify = useMutation({
    mutationFn: () => modifyPlan(daily.data?.plan?.id ?? "", changes[0] ?? "make_easier", { requested_changes: changes, reason: "user_adjustment" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] })
  });
  const items = daily.data?.plan?.items ?? [];
  return (
    <>
      <Panel title="Today program">
        {daily.isLoading ? <LoadingState /> : <PlanSummary plan={daily.data?.plan} />}
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <TextField label="Available minutes" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} />
        </View>
        <ActionButton label={generate.isPending ? "Generating..." : "Generate today"} onPress={() => generate.mutate()} />
        <ActionButton label={start.isPending ? "Opening player..." : "Start guided workout"} disabled={!daily.data?.plan?.id} onPress={() => start.mutate()} />
        <ErrorText error={generate.error ?? start.error} />
      </Panel>
      <Panel title="Ordered movements">
        <View style={{ gap: 12 }}>
          {items.map((item) => <MovementCard key={`${item.section}-${item.exercise_id}`} item={item} />)}
          {!items.length ? <BodyText muted>Generate a plan to see movement previews.</BodyText> : null}
        </View>
      </Panel>
      <Panel title="Adapt session">
        <ChipGroup labels={MODIFICATION_OPTIONS} selected={changes} onToggle={(value) => setChanges(changes.includes(value) ? changes.filter((item) => item !== value) : [...changes, value])} />
        <BodyText muted>Changes are interpreted conservatively and only affect incomplete plan content.</BodyText>
        <ActionButton label={modify.isPending ? "Applying..." : "Apply adaptation"} disabled={!daily.data?.plan?.id} onPress={() => modify.mutate()} />
        <ErrorText error={modify.error} />
      </Panel>
    </>
  );
}

export function QuickSessionScreen() {
  const [minutes, setMinutes] = useState("8");
  const [focus, setFocus] = useState<string[]>(["core"]);
  const quick = useMutation({ mutationFn: () => createQuickSession({ available_minutes: Number(minutes) || 8, pain: 2, energy: 3, chair_only: true, equipment: ["chair"], target_focuses: focus, natural_request: `${minutes} minute ${focus.join(" ")} chair session` }) });
  const items = (quick.data as { plan?: MovementPlan } | undefined)?.plan?.items ?? [];
  return (
    <>
      <Panel title="Quick session">
        <TextField label="Duration minutes" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} />
        <ChipGroup labels={["core", "back", "balance", "upper body", "lower body"]} selected={focus} onToggle={(value) => setFocus(focus.includes(value) ? focus.filter((item) => item !== value) : [...focus, value])} />
        <ActionButton label={quick.isPending ? "Creating..." : "Create quick session"} onPress={() => quick.mutate()} />
        <ErrorText error={quick.error} />
      </Panel>
      <Panel title="Session preview">
        <View style={{ gap: 12 }}>
          {items.map((item) => <MovementCard key={`${item.section}-${item.exercise_id}`} item={item} />)}
          {!items.length ? <BodyText muted>No quick session created yet.</BodyText> : null}
        </View>
      </Panel>
    </>
  );
}

export function WeeklyPlanScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => apiFetch<{ plan: { days?: ProgramDay[]; total_planned_minutes?: number; week_start?: string } | null }>("/plans/weekly/current") });
  const generate = useMutation({ mutationFn: generateWeeklyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly"] }) });
  const days = weekly.data?.plan?.days ?? [];
  return (
    <Panel title="Seven-day program">
      {weekly.isLoading ? <LoadingState /> : null}
      <BodyText muted>{weekly.data?.plan?.week_start ? `Week of ${weekly.data.plan.week_start}` : "Generate a week to see recovery-aware scheduling."}</BodyText>
      <View style={{ gap: 10 }}>
        {days.map((day) => (
          <View key={`${day.day}-${day.date}`} style={{ borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 6 }}>
            <Text style={{ color: theme.text, fontWeight: "800" }}>{day.day} {day.date ? `- ${day.date}` : ""}</Text>
            <Text style={{ color: theme.muted }}>{day.status ?? "planned"} - {day.focus ?? "mobility"} - {day.duration_minutes ?? day.planned_duration ?? 0} min</Text>
            {day.items?.[0] ? <ExerciseMediaFrame media={day.items[0].media} title={day.items[0].name} section={day.focus} target={day.items[0].equipment} /> : <BodyText muted>Recovery day. Keep movement optional and easy.</BodyText>}
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <SecondaryLink href="/daily-plan" label="Open day" />
              <SecondaryLink href="/readiness" label={day.session_type === "movement" ? "Check readiness" : "Swap rest day"} />
            </View>
          </View>
        ))}
      </View>
      {!weekly.data?.plan ? <BodyText muted>No weekly plan saved yet.</BodyText> : null}
      <ActionButton label={generate.isPending ? "Generating..." : "Generate weekly plan"} onPress={() => generate.mutate()} />
    </Panel>
  );
}

export function MonthlyPlanScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const monthly = useQuery({ queryKey: ["monthly"], queryFn: () => apiFetch<{ plan: { weeks?: MonthWeek[]; timeline?: string[] } | null }>("/plans/monthly/current") });
  const generate = useMutation({ mutationFn: generateMonthlyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly"] }) });
  const weeks = monthly.data?.plan?.weeks ?? [];
  return (
    <Panel title="Four-week progression">
      {monthly.isLoading ? <LoadingState /> : null}
      <View style={{ gap: 12 }}>
        {weeks.map((week) => (
          <View key={week.week} style={{ borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Week {week.week}: {week.phase}</Text>
            <Text style={{ color: week.hold ? theme.safety : theme.muted }}>{week.progression_reason ?? "Conservative progression based on tolerance."}</Text>
            <Text style={{ color: theme.text }}>{week.planned_sessions ?? 0} sessions - {week.recovery_days ?? 0} recovery days - {week.status ?? "planned"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(week.days ?? []).map((day) => (
                <View key={`${week.week}-${day.day}`} style={{ minWidth: 74, borderRadius: 8, borderColor: theme.border, borderWidth: 1, padding: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: "800" }}>{day.day}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{day.status}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
      {!monthly.data?.plan ? <BodyText muted>No monthly phase view saved yet.</BodyText> : null}
      <ActionButton label={generate.isPending ? "Generating..." : "Generate four-week program"} onPress={() => generate.mutate()} />
      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>Ready-made programs</Text>
        {READY_MADE.map((name) => <BodyText key={name}>{name}</BodyText>)}
      </View>
    </Panel>
  );
}
