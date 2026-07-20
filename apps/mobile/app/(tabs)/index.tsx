import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, generateDailyPlan, startSession, submitReadiness } from "../../src/api";
import { ExerciseMediaFrame } from "../../src/features/shared/ExerciseMediaFrame";
import type { MovementPlan } from "../../src/features/shared/productTypes";
import { useTheme } from "../../src/theme";

export default function HomeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const plan = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const calendar = useQuery({ queryKey: ["calendar"], queryFn: () => apiFetch<any>("/calendar") });
  const createReadiness = useMutation({ mutationFn: submitReadiness, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["readiness"] }) });
  const createPlan = useMutation({ mutationFn: () => generateDailyPlan(15), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const start = useMutation({
    mutationFn: async () => startSession(plan.data?.plan?.id),
    onSuccess: (data) => router.push(`/workout/${data.session.id}` as never)
  });
  const safety = readiness.data?.item?.decision;
  const blocked = safety?.action === "BLOCK_AND_SHOW_SAFETY_MESSAGE";
  const items = plan.data?.plan?.items ?? [];
  const first = items[0];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "900" }}>Home</Text>
        <Text style={{ color: theme.muted, fontSize: 16 }}>Move safely. Learn your range.</Text>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Today</Text>
        {first ? <ExerciseMediaFrame media={first.media} title={first.name} section={first.section} target={first.equipment} size="large" /> : <ExerciseMediaFrame title="Generate today's session" section="Readiness" target="Movement preview" size="large" />}
        <Text style={{ color: theme.text, fontWeight: "800" }}>{plan.data?.plan ? `${plan.data.plan.total_minutes ?? plan.data.plan.total_duration ?? 0} minutes - ${items.length} movements` : "No session planned yet"}</Text>
        <Text style={{ color: theme.muted }}>{safety?.explanation ?? "Complete readiness before movement."}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Start guided workout" disabled={!plan.data?.plan || blocked} onPress={() => start.mutate()} style={{ minHeight: 54, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary, opacity: !plan.data?.plan || blocked ? 0.5 : 1 }}>
          <Text style={{ color: theme.surface, fontWeight: "900" }}>{start.isPending ? "Opening player..." : "Start guided workout"}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Complete readiness check" onPress={() => createReadiness.mutate()} style={{ minHeight: 48, flexGrow: 1, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{createReadiness.isPending ? "Saving..." : "Readiness"}</Text>
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
      {start.error || createPlan.error || createReadiness.error ? <Text style={{ color: theme.safety }}>{String((start.error ?? createPlan.error ?? createReadiness.error) instanceof Error ? (start.error ?? createPlan.error ?? createReadiness.error)?.message : "Action failed")}</Text> : null}
    </ScrollView>
  );
}
