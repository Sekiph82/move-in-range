import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, createQuickSession, modifyPlan } from "../../api";
import { useTheme } from "../../theme";
import { ExerciseMediaFrame } from "../shared/ExerciseMediaFrame";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";
import type { MonthlyPlan, MovementPlan, PlanExerciseItem, ProgramDay, WeeklyPlan } from "../shared/productTypes";

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
  const [changes, setChanges] = useState<string[]>(["easier"]);
  const queryClient = useQueryClient();
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const modify = useMutation({
    mutationFn: () => modifyPlan(daily.data?.plan?.id ?? "", changes[0] ?? "make_easier", { requested_changes: changes, reason: "user_adjustment" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] })
  });
  const items = daily.data?.plan?.items ?? [];
  const startWorkout = () => {
    if (!daily.data?.plan?.id) return;
    router.push(`/workout-preview?planId=${encodeURIComponent(daily.data.plan.id)}&source=today&returnTo=/daily-plan` as never);
  };
  return (
    <>
      <Panel title="Today program">
        {daily.isLoading ? <LoadingState /> : <PlanSummary plan={daily.data?.plan} />}
        <ActionButton label="Generate today" onPress={() => router.push("/generate-plan?scope=daily&source=today&returnTo=/daily-plan" as never)} />
        <ActionButton label="Workout preview" disabled={!daily.data?.plan?.id} onPress={startWorkout} />
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => apiFetch<{ plan: WeeklyPlan | null }>("/plans/weekly/current") });
  const days = weekly.data?.plan?.days ?? [];
  const selectedDay = useMemo(() => days.find((day) => day.date === selectedDate) ?? days.find((day) => day.status === "planned") ?? days[0], [days, selectedDate]);
  return (
    <Panel title="Seven-day program">
      {weekly.isLoading ? <LoadingState /> : null}
      <BodyText muted>{weekly.data?.plan?.week_start ? `Week of ${weekly.data.plan.week_start}` : "Generate a week to see recovery-aware scheduling."}</BodyText>
      <View style={{ gap: 10 }}>
        {days.map((day) => (
          <Pressable
            key={day.session_id ?? day.id ?? `${day.day}-${day.date}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${day.day} ${day.status ?? "planned"} session`}
            onPress={() => setSelectedDate(day.date ?? null)}
            style={{ borderColor: selectedDay?.date === day.date ? theme.primary : theme.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 8, backgroundColor: theme.surface }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>{day.day} {day.date ? `- ${day.date}` : ""}</Text>
            <Text style={{ color: theme.muted }}>{day.status ?? "planned"} - {day.focus ?? "mobility"} - {day.duration_minutes ?? day.planned_duration ?? 0} min - {day.items?.length ?? 0} movements</Text>
            {day.items?.[0] ? <ExerciseMediaFrame media={day.items[0].media} title={day.items[0].name} section={day.focus} target={day.items[0].equipment} animated={false} /> : <BodyText muted>Recovery day. Keep movement optional and easy.</BodyText>}
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <SecondaryLink href={day.items?.[0] ? `/exercise/${day.items[0].exercise_id}` : "/readiness"} label={day.items?.[0] ? "Lead movement" : "Recovery check"} />
              <SecondaryLink href="/readiness" label={day.session_type === "movement" ? "Check readiness" : "Swap rest day"} />
            </View>
          </Pressable>
        ))}
      </View>
      {selectedDay ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>{selectedDay.day} detail</Text>
          {(selectedDay.items ?? []).map((item) => <MovementCard key={item.plan_item_id ?? `${selectedDay.date}-${item.exercise_id}`} item={item} />)}
          {!(selectedDay.items ?? []).length ? <BodyText muted>This date is planned as recovery, with no copied workout items.</BodyText> : null}
          {(selectedDay.items ?? []).length ? <ActionButton label="Preview this workout" onPress={() => router.push(`/workout-preview?planId=${encodeURIComponent(selectedDay.daily_plan_id ?? weekly.data?.plan?.id ?? "")}&source=week&returnTo=/weekly-plan` as never)} /> : null}
        </View>
      ) : null}
      {!weekly.data?.plan ? <BodyText muted>No weekly plan saved yet.</BodyText> : null}
      <ActionButton label="Generate weekly plan" onPress={() => router.push("/generate-plan?scope=weekly&source=weekly-plan&returnTo=/weekly-plan" as never)} />
    </Panel>
  );
}

export function MonthlyPlanScreen() {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const monthly = useQuery({ queryKey: ["monthly"], queryFn: () => apiFetch<{ plan: MonthlyPlan | null }>("/plans/monthly/current") });
  const weeks = monthly.data?.plan?.weeks ?? [];
  const allDays = useMemo(() => weeks.flatMap((week) => week.days ?? []), [weeks]);
  const selectedDay = useMemo(() => allDays.find((day) => day.date === selectedDate) ?? allDays.find((day) => day.status === "planned") ?? allDays[0], [allDays, selectedDate]);
  return (
    <Panel title="Four-week progression">
      {monthly.isLoading ? <LoadingState /> : null}
      <View style={{ gap: 12 }}>
        {weeks.map((week) => (
          <View key={week.week} style={{ borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Week {week.week}: {week.phase}</Text>
            <Text style={{ color: week.hold ? theme.safety : theme.muted }}>{week.progression_reason ?? "Conservative progression based on tolerance."}</Text>
            <Text style={{ color: theme.text }}>{week.planned_sessions ?? 0} sessions - {week.recovery_days ?? 0} recovery days - {week.total_planned_minutes ?? 0} min - {week.status ?? "planned"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(week.days ?? []).map((day) => (
                <Pressable key={day.session_id ?? day.id ?? `${week.week}-${day.day}-${day.date}`} accessibilityRole="button" accessibilityLabel={`Open ${day.date ?? day.day} plan`} onPress={() => setSelectedDate(day.date ?? null)} style={{ width: 92, borderRadius: 8, borderColor: selectedDay?.date === day.date ? theme.primary : theme.border, borderWidth: 1, padding: 8, gap: 6, backgroundColor: theme.surface }}>
                  <Text style={{ color: theme.text, fontWeight: "800" }}>{day.day}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{day.status}</Text>
                  {day.items?.[0] ? <ExerciseMediaFrame media={day.items[0].media} title={day.items[0].name} section={day.focus} target={day.items[0].target} animated={false} /> : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
      {selectedDay ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>{selectedDay.date ?? selectedDay.day} session</Text>
          {(selectedDay.items ?? []).map((item) => <MovementCard key={item.plan_item_id ?? `${selectedDay.date}-${item.exercise_id}`} item={item} />)}
          {!(selectedDay.items ?? []).length ? <BodyText muted>This date is recovery or held by safety rules.</BodyText> : null}
          {(selectedDay.items ?? []).length ? <ActionButton label="Preview this workout" onPress={() => router.push(`/workout-preview?planId=${encodeURIComponent(selectedDay.daily_plan_id ?? monthly.data?.plan?.id ?? "")}&source=month&returnTo=/monthly-plan` as never)} /> : null}
        </View>
      ) : null}
      {!monthly.data?.plan ? <BodyText muted>No monthly phase view saved yet.</BodyText> : null}
      <ActionButton label="Generate four-week program" onPress={() => router.push("/generate-plan?scope=monthly&source=monthly-plan&returnTo=/monthly-plan" as never)} />
      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>Ready-made programs</Text>
        {READY_MADE.map((name) => <BodyText key={name}>{name}</BodyText>)}
      </View>
    </Panel>
  );
}
