import { useMemo } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../api";
import { useTheme } from "../../theme";
import { ExerciseMediaFrame } from "../shared/ExerciseMediaFrame";
import { ActionButton, BodyText, ErrorText, LoadingState, Panel } from "../shared/ui";
import type { MovementPlan, PlanExerciseItem } from "../shared/productTypes";
import { readinessStartHref } from "../readiness/startContext";

function planItemIds(plan?: MovementPlan | null) {
  return (plan?.items ?? []).map((item) => item.plan_item_id ?? item.id ?? item.exercise_id);
}

function itemDuration(item: PlanExerciseItem) {
  return item.work_seconds ?? item.duration_seconds ?? 45;
}

export function assertCanonicalPlanItems(previewPlan?: MovementPlan | null, sessionPlan?: MovementPlan | null) {
  const previewIds = planItemIds(previewPlan).join("|");
  const sessionIds = planItemIds(sessionPlan).join("|");
  if (!previewIds || !sessionIds || previewIds !== sessionIds) {
    throw new Error("Workout plan changed before start. Reopen the preview and try again.");
  }
  return true;
}

export function WorkoutPreviewScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ planId?: string; source?: string; returnTo?: string; adjusted?: string }>();
  const planId = params.planId;
  const plan = useQuery({
    queryKey: ["plan", planId],
    enabled: Boolean(planId),
    queryFn: () => apiFetch<{ plan: MovementPlan }>(`/plans/${encodeURIComponent(String(planId))}`)
  });
  const movementPlan = plan.data?.plan;
  const itemIds = useMemo(() => planItemIds(movementPlan), [movementPlan]);

  if (!planId) return <Panel title="Workout preview"><BodyText muted>No saved plan was selected.</BodyText></Panel>;
  if (plan.isLoading) return <LoadingState label="Loading workout preview" />;

  return (
    <View style={{ gap: 14 }}>
      <Panel title={movementPlan?.title ?? "Workout Preview"}>
        <BodyText>{movementPlan?.date ?? "Today"} - {movementPlan?.total_minutes ?? movementPlan?.total_duration ?? 0} minutes - {movementPlan?.items?.length ?? 0} movements</BodyText>
        <BodyText muted>Focus: {movementPlan?.session_type?.replaceAll("_", " ") ?? movementPlan?.phase ?? "movement"} - Intensity: {movementPlan?.intensity ?? "low"}</BodyText>
        <BodyText muted>Equipment: {[...new Set((movementPlan?.items ?? []).map((item) => item.equipment).filter(Boolean))].join(", ") || "body weight"}</BodyText>
        {params.adjusted === "true" ? <Text style={{ color: theme.primary, fontWeight: "800" }}>Adjusted using today's readiness</Text> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(movementPlan?.items ?? []).slice(0, 3).map((item) => <View key={item.plan_item_id ?? item.exercise_id} style={{ flex: 1 }}><ExerciseMediaFrame media={item.media} title={item.name} section={item.section} target={item.equipment} animated={false} /></View>)}
        </View>
        <ActionButton
          label="Continue"
          disabled={!movementPlan?.items?.length}
          onPress={() => router.push(readinessStartHref({ source: "preview", planId, sessionDate: movementPlan?.date, sessionType: movementPlan?.session_type, returnTo: `/workout-preview?planId=${encodeURIComponent(planId)}&source=${params.source ?? "preview"}` }) as never)}
        />
        <ActionButton label="Modify today's workout" onPress={() => router.push(`/generate-plan?scope=replace-day&existingPlanId=${encodeURIComponent(planId)}&selectedDate=${encodeURIComponent(movementPlan?.date ?? "")}&returnTo=${encodeURIComponent(`/workout-preview?planId=${planId}`)}` as never)} />
        <ActionButton label="Back" onPress={() => router.replace((params.returnTo ?? "/daily-plan") as never)} />
        <BodyText muted>Integrity check: {itemIds.length} plan item ids are ready for the player.</BodyText>
        <ErrorText error={plan.error} />
      </Panel>
      <Panel title="Movements">
        <View style={{ gap: 12 }}>
          {(movementPlan?.items ?? []).map((item, index) => (
            <View key={item.plan_item_id ?? item.id ?? `${item.exercise_id}-${index}`} style={{ borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 8, backgroundColor: theme.surface }}>
              <Text style={{ color: theme.text, fontWeight: "900", fontSize: 17 }}>{index + 1}. {item.name}</Text>
              <ExerciseMediaFrame media={item.media} title={item.name} section={item.section} target={item.equipment} animated={false} />
              <BodyText muted>{Math.round(itemDuration(item) / 60) || 1} min work - {item.rest_seconds ?? 20}s rest - {item.body_part ?? item.target ?? "movement"}</BodyText>
              <BodyText>{item.instructions?.[0] ?? item.breathing_cue ?? "Move with control and stop if symptoms appear."}</BodyText>
            </View>
          ))}
        </View>
      </Panel>
    </View>
  );
}
