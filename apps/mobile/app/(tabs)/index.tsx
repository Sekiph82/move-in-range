import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { completeSession, createQuickSession, generateDailyPlan, reportPain, startSession, submitReadiness, apiFetch } from "../../src/api";
import { useTheme } from "../../src/theme";

const calendarEventLabels: Record<string, string> = {
  daily_plan: "Daily plan",
  session: "Workout",
  reminder: "Reminder",
  recovery: "Recovery"
};

const calendarStatusLabels: Record<string, string> = {
  planned: "Planned",
  completed: "Completed",
  skipped: "Skipped",
  partial: "Partially completed",
  pain_stop: "Stopped for pain",
  symptom_stop: "Stopped for symptoms",
  recovery: "Recovery",
  blocked: "Blocked"
};

export default function TodayScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const plan = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<any>("/plans/daily/today") });
  const calendar = useQuery({ queryKey: ["calendar"], queryFn: () => apiFetch<any>("/calendar") });
  const createReadiness = useMutation({ mutationFn: submitReadiness, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["readiness"] }) });
  const createPlan = useMutation({ mutationFn: () => generateDailyPlan(15), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const quickSession = useMutation({
    mutationFn: () => createQuickSession({ available_minutes: 8, pain: 2, energy: 3, chair_only: true, equipment: ["chair"], natural_request: "8 minute quiet chair session" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] })
  });
  const workout = useMutation({
    mutationFn: async () => {
      const started = await startSession(plan.data?.plan?.id);
      const id = started.session.id as string;
      setSessionId(id);
      await reportPain(id);
      return completeSession(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insights"] })
  });
  const safety = readiness.data?.item?.decision;
  const blocked = safety?.action === "BLOCK_AND_SHOW_SAFETY_MESSAGE";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Today</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>Move safely. Learn your range.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["/readiness", "Readiness"],
          ["/daily-plan", "Daily plan"],
          ["/quick-session", "Quick session"],
          ["/workout/today", "Workout"]
        ].map(([href, label]) => (
          <Link key={href} href={href as never} asChild>
            <Pressable accessibilityRole="link" style={{ minHeight: 40, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>{label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      {readiness.isLoading ? <ActivityIndicator accessibilityLabel="Loading readiness" /> : (
        <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Readiness</Text>
          <Text style={{ color: theme.primary }}>{safety?.action ?? "Not checked today"}</Text>
          <Text style={{ color: theme.muted }}>{safety?.explanation ?? "Complete a readiness check before generating a workout."}</Text>
          <Pressable accessibilityLabel="Complete readiness check" onPress={() => createReadiness.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
            <Text style={{ color: theme.primary, fontWeight: "700" }}>{createReadiness.isPending ? "Saving..." : "Complete readiness check"}</Text>
          </Pressable>
        </View>
      )}
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Daily plan</Text>
        {plan.data?.plan ? plan.data.plan.items.map((item: any) => (
          <Text key={`${item.block}-${item.exercise_id}`} style={{ color: theme.text }}>{item.block}: {item.name} - {Math.round(item.duration_seconds / 60)} min</Text>
        )) : <Text style={{ color: theme.muted }}>No plan yet. Generate one after readiness.</Text>}
        <Pressable accessibilityLabel="Generate daily plan" disabled={blocked} onPress={() => createPlan.mutate()} style={{ minHeight: 48, justifyContent: "center", opacity: blocked ? 0.5 : 1 }}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>{blocked ? "Plan blocked by safety result" : createPlan.isPending ? "Generating..." : "Generate daily plan"}</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>What can I do today?</Text>
        <Text style={{ color: theme.muted }}>Fast entry creates a real safety-checked quick-session plan.</Text>
        <Pressable accessibilityLabel="Create eight minute chair session" onPress={() => quickSession.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>{quickSession.isPending ? "Creating..." : "Create 8-minute chair session"}</Text>
        </Pressable>
        {(calendar.data?.items ?? []).slice(0, 3).map((item: any) => <Text key={item.id} style={{ color: theme.text }}>{item.event_date}: {calendarEventLabels[item.event_type] ?? "Movement event"} - {calendarStatusLabels[item.status] ?? "Scheduled"}</Text>)}
      </View>
      <Pressable accessibilityLabel="Start guided workout" disabled={!plan.data?.plan || blocked} onPress={() => workout.mutate()} style={{ minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary, opacity: !plan.data?.plan || blocked ? 0.5 : 1 }}>
        <Text style={{ color: theme.surface, fontWeight: "700" }}>{workout.isPending ? "Recording workout..." : sessionId ? "Complete another guided workout" : "Start guided workout"}</Text>
      </Pressable>
      {workout.error ? <Text style={{ color: theme.safety }}>{String(workout.error.message)}</Text> : null}
    </ScrollView>
  );
}
