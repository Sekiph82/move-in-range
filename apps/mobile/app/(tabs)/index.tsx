import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../src/api";
import { ExerciseMediaFrame } from "../../src/features/shared/ExerciseMediaFrame";
import { hasValidSameDayReadiness } from "../../src/features/readiness/readinessGate";
import type { MovementPlan } from "../../src/features/shared/productTypes";
import { useTheme } from "../../src/theme";
import { TabScreenScroll } from "../../src/features/shared/ui";

export default function HomeScreen() {
  const theme = useTheme();
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const plan = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const calendar = useQuery({ queryKey: ["calendar"], queryFn: () => apiFetch<any>("/calendar") });
  const safety = readiness.data?.item?.decision;
  const blocked = safety?.action === "BLOCK_AND_SHOW_SAFETY_MESSAGE";
  const items = plan.data?.plan?.items ?? [];
  const first = items[0];
  const latestReadiness = readiness.data?.item;
  const startLabel = "Check readiness & start";
  const startWorkout = () => {
    if (!plan.data?.plan?.id) return;
    router.push(`/workout-preview?planId=${encodeURIComponent(plan.data.plan.id)}&source=home&returnTo=/(tabs)` as never);
  };
  return (
    <TabScreenScroll testID="home-tab-scroll">
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "900" }}>Home</Text>
        <Text style={{ color: theme.muted, fontSize: 16 }}>Move safely. Learn your range.</Text>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Today</Text>
        {first ? <ExerciseMediaFrame media={first.media} title={first.name} section={first.section} target={first.equipment} size="large" /> : <ExerciseMediaFrame title="Generate today's session" section="Readiness" target="Movement preview" size="large" />}
        <Text style={{ color: theme.text, fontWeight: "800" }}>{plan.data?.plan ? `${plan.data.plan.total_minutes ?? plan.data.plan.total_duration ?? 0} minutes - ${items.length} movements` : "No session planned yet"}</Text>
        <Text style={{ color: theme.muted }}>{safety?.explanation ?? "Complete readiness before movement."}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={startLabel} disabled={!plan.data?.plan || blocked} onPress={startWorkout} style={{ minHeight: 54, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary, opacity: !plan.data?.plan || blocked ? 0.5 : 1 }}>
          <Text style={{ color: theme.surface, fontWeight: "900" }}>{startLabel}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open readiness check" onPress={() => router.push("/readiness" as never)} style={{ minHeight: 48, flexGrow: 1, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{hasValidSameDayReadiness(latestReadiness) ? "View readiness" : "Check readiness"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Generate daily plan" disabled={blocked} onPress={() => router.push("/generate-plan?scope=daily&source=home&returnTo=/(tabs)" as never)} style={{ minHeight: 48, flexGrow: 1, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface, opacity: blocked ? 0.5 : 1 }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>Generate plan</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>This week</Text>
        <Text style={{ color: theme.text }}>Completed events: {(calendar.data?.items ?? []).filter((item: any) => item.status === "completed").length}</Text>
        <Text style={{ color: theme.muted }}>Recent activity and recovery days update as sessions are completed.</Text>
      </View>
    </TabScreenScroll>
  );
}
