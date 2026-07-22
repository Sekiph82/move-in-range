import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, generateDailyPlan, startSession } from "../../src/api";
import { ExerciseMediaFrame } from "../../src/features/shared/ExerciseMediaFrame";
import { hasValidSameDayReadiness, readinessAllowsStart, workoutStartLabel } from "../../src/features/readiness/readinessGate";
import type { MovementPlan } from "../../src/features/shared/productTypes";
import { useTheme } from "../../src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const plan = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const calendar = useQuery({ queryKey: ["calendar"], queryFn: () => apiFetch<any>("/calendar") });
  const createPlan = useMutation({ mutationFn: () => generateDailyPlan(15), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const start = useMutation({
    mutationFn: async () => startSession(plan.data?.plan?.id),
    onSuccess: (data) => router.push(`/workout/${data.session.id}` as never)
  });
  const safety = readiness.data?.item?.decision;
  const blocked = safety?.action === "BLOCK_AND_SHOW_SAFETY_MESSAGE";
  const items = plan.data?.plan?.items ?? [];
  const first = items[0];
  const latestReadiness = readiness.data?.item;
  const readinessReady = hasValidSameDayReadiness(latestReadiness) && readinessAllowsStart(latestReadiness);
  const startLabel = workoutStartLabel(latestReadiness);
  const startWorkout = () => {
    if (!plan.data?.plan?.id) return;
    if (!readinessReady) {
      router.push(`/readiness?intent=start&planId=${plan.data.plan.id}` as never);
      return;
    }
    start.mutate();
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Math.max(20, insets.top + 12), paddingBottom: Math.max(32, insets.bottom + 88), gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "900" }}>Home</Text>
        <Text style={{ color: theme.muted, fontSize: 16 }}>Move safely. Learn your range.</Text>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Today</Text>
        {first ? <ExerciseMediaFrame media={first.media} title={first.name} section={first.section} target={first.equipment} size="large" /> : <ExerciseMediaFrame title="Generate today's session" section="Readiness" target="Movement preview" size="large" />}
        <Text style={{ color: theme.text, fontWeight: "800" }}>{plan.data?.plan ? `${plan.data.plan.total_minutes ?? plan.data.plan.total_duration ?? 0} minutes - ${items.length} movements` : "No session planned yet"}</Text>
        <Text style={{ color: theme.muted }}>{safety?.explanation ?? "Complete readiness before movement."}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={startLabel} disabled={!plan.data?.plan || blocked} onPress={startWorkout} style={{ minHeight: 54, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary, opacity: !plan.data?.plan || blocked ? 0.5 : 1 }}>
          <Text style={{ color: theme.surface, fontWeight: "900" }}>{start.isPending ? "Opening player..." : startLabel}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open readiness check" onPress={() => router.push("/readiness" as never)} style={{ minHeight: 48, flexGrow: 1, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{hasValidSameDayReadiness(latestReadiness) ? "View readiness" : "Check readiness"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Generate daily plan" disabled={blocked} onPress={() => createPlan.mutate()} style={{ minHeight: 48, flexGrow: 1, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface, opacity: blocked ? 0.5 : 1 }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{createPlan.isPending ? "Generating..." : "Generate plan"}</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>This week</Text>
        <Text style={{ color: theme.text }}>Completed events: {(calendar.data?.items ?? []).filter((item: any) => item.status === "completed").length}</Text>
        <Text style={{ color: theme.muted }}>Recent activity and recovery days update as sessions are completed.</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {[
          ["Program", "/(tabs)/program"],
          ["Move", "/(tabs)/move"],
          ["Progress", "/(tabs)/progress"],
          ["Privacy", "/privacy"]
        ].map(([label, href]) => (
          <Pressable key={href} accessibilityRole="link" accessibilityLabel={label} onPress={() => router.push(href as never)} style={{ minHeight: 44, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
            <Text style={{ color: theme.primary, fontWeight: "800" }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {start.error || createPlan.error ? <Text style={{ color: theme.safety }}>{String((start.error ?? createPlan.error) instanceof Error ? (start.error ?? createPlan.error)?.message : "Action failed")}</Text> : null}
    </ScrollView>
  );
}
